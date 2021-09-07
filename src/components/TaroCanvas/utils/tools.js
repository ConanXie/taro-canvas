/* eslint-disable prefer-destructuring */
import Taro from '@tarojs/taro'

/**
 * @description 生成随机字符串
 * @param  { number } length - 字符串长度
 * @returns { string }
 */
export function randomString (length) {
  let str = Math.random().toString(36).substr(2)
  if (str.length >= length) {
    return str.substr(0, length)
  }
  str += randomString(length - str.length)
  return str
}

/**
 * 随机创造一个id
 * @param  { number } length - 字符串长度
 * @returns { string }
 */
export function getRandomId (prefix = 'canvas', length = 10) {
  return prefix + randomString(length)
}

/**
 * @description 获取最大高度
 * @param  {} config
 * @returns { number }
 */
export function getHeight (config) {
  const getTextHeight = text => {
    const fontHeight = text.lineHeight || text.fontSize
    let height = 0
    if (text.baseLine === 'top') {
      height = fontHeight
    } else if (text.baseLine === 'middle') {
      height = fontHeight / 2
    } else {
      height = 0
    }
    return height
  }
  const heightArr = [];
  (config.blocks || []).forEach(item => {
    heightArr.push(item.y + item.height)
  });
  (config.texts || []).forEach(item => {
    let height
    if (Object.prototype.toString.call(item.text) === '[object Array]') {
      item.text.forEach(i => {
        height = getTextHeight({ ...i, baseLine: item.baseLine })
        heightArr.push(item.y + height)
      })
    } else {
      height = getTextHeight(item)
      heightArr.push(item.y + height)
    }
  });
  (config.images || []).forEach(item => {
    heightArr.push(item.y + item.height)
  });
  (config.lines || []).forEach(item => {
    heightArr.push(item.startY)
    heightArr.push(item.endY)
  })
  const sortRes = heightArr.sort((a, b) => b - a)
  let canvasHeight = 0
  if (sortRes.length > 0) {
    canvasHeight = sortRes[0]
  }
  if (config.height < canvasHeight || !config.height) {
    return canvasHeight
  }
  return config.height
}

/**
 * 将http转为https
 * @param {String}} rawUrl 图片资源url
 * @returns { string }
 */
export function mapHttpToHttps (rawUrl) {
  if (rawUrl.indexOf(':') < 0) {
    return rawUrl
  }
  const urlComponent = rawUrl.split(':')
  if (urlComponent.length === 2) {
    if (urlComponent[0] === 'http') {
      urlComponent[0] = 'https'
      return `${urlComponent[0]}:${urlComponent[1]}`
    }
  }
  return rawUrl
}

/**
 * 获取 rpx => px 的转换系数
 * @returns { number } factor 单位转换系数 1rpx = factor * px
 */
export const getFactor = () => {
  const sysInfo = Taro.getSystemInfoSync()
  const { screenWidth } = sysInfo
  return screenWidth / 750
}

/**
 * @description rpx => px 基础方法
 * @param { number } rpx - 需要转换的数值
 * @param { number } factor - 转化因子
 * @returns { number }
 */
export const toPx = (rpx, factor = getFactor()) => parseInt(rpx * factor, 10)

/**
 * @description px => rpx
 * @param { number } px - 需要转换的数值
 * @param { number } factor - 转化因子
 * @returns { number }
 */
export const toRpx = (px, factor = getFactor()) => parseInt(px / factor, 10)

/**
 * 下载图片资源
 * @param { string } url
 * @returns  { Promise }
 */
export function downImage (url) {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line no-undef
    if (/^http/.test(url) && !new RegExp(wx.env.USER_DATA_PATH).test(url)) { // wx.env.USER_DATA_PATH 文件系统中的用户目录路径
      Taro.downloadFile({
        url: mapHttpToHttps(url),
        success: res => {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath)
          } else {
            console.log('下载失败', res)
            reject(res)
          }
        },
        fail (err) {
          console.log('下载失败了', err)
          reject(err)
        },
      })
    } else {
      resolve(url) // 支持本地地址
    }
  })
}

/**
 * 获取图片信息
 * @param {*} imgPath
 * @param {*} index
 * @returns  { Promise }
 */
export function getImageInfo (imgPath) {
  return new Promise((resolve, reject) => {
    Taro.getImageInfo({
      src: imgPath,
      success (res) { resolve({ imgInfo: res }) },
      fail (err) {
        reject(err)
      },
    })
  })
}

/**
* 下载图片并获取图片信息
* @param  {} item 图片参数信息
* @param  {} index 图片下标
* @returns  { Promise } result 整理后的图片信息
*/
export const downloadImageAndInfo = (item, index) => new Promise((resolve, reject) => {
  const { x, y, url, zIndex } = item
  downImage(url, index).then(imgPath => getImageInfo(imgPath, index)
    .then(({ imgInfo }) => { // 获取图片信息
    // 根据画布的宽高计算出图片绘制的大小，这里会保证图片绘制不变形， 即宽高比不变，截取再拉伸
      let sx
      let sy
      const borderRadius = item.borderRadius || 0
      const setWidth = item.width
      const setHeight = item.height
      const width = toRpx(imgInfo.width) // 图片真实宽度
      const height = toRpx(imgInfo.height) // 图片真实高度

      if (width / height <= setWidth / setHeight) {
        sx = 0
        sy = (height - ((width / setWidth) * setHeight)) / 2
      } else {
        sy = 0
        sx = (width - ((height / setHeight) * setWidth)) / 2
      }
      const result = {
        type: 'image',
        borderRadius,
        borderWidth: item.borderWidth,
        borderColor: item.borderColor,
        zIndex: typeof zIndex !== 'undefined' ? zIndex : index,
        imgPath: url,
        sx,
        sy,
        sw: (width - (sx * 2)),
        sh: (height - (sy * 2)),
        x,
        y,
        w: setWidth,
        h: setHeight,
      }
      resolve(result)
    }).catch(err => {
      console.log('下载图片失败', err)
      reject(err)
    }))
})

/**
 * 获取线性渐变色
 * @param {*} color 目前只支持0-180deg线性渐变色, 否则报错
 * @param {*} color
 * @returns  { Promise }
 */
// TODO: 待优化
export function getLinearColor (ctx, color, startX, startY, w, h) {
  if (typeof startX !== 'number' || typeof startY !== 'number' || typeof w !== 'number' || typeof h !== 'number') {
    console.warn('坐标或者宽高只支持数字')
    return color
  }
  let grd = color
  if (color.includes('linear-gradient')) { // fillStyle不支持线性渐变色
    const colorList = color.match(/\((\d+)deg,\s(.+)\s\d+%,\s(.+)\s\d+%/)
    const radian = colorList[1] // 渐变弧度（角度）
    const color1 = colorList[2]
    const color2 = colorList[3]

    const L = Math.sqrt(w * w + h * h)
    const x = Math.ceil(Math.sin(180 - radian) * L)
    const y = Math.ceil(Math.cos(180 - radian) * L)

    // 根据弧度和宽高确定渐变色的两个点的坐标
    if (Number(radian) === 180 || Number(radian) === 0) {
      if (Number(radian) === 180) {
        grd = ctx.createLinearGradient(startX, startY, startX, startY + h)
      }
      if (Number(radian) === 0) {
        grd = ctx.createLinearGradient(startX, startY + h, startX, startY)
      }
    } else if (radian > 0 && radian < 180) {
      grd = ctx.createLinearGradient(startX, startY, x + startX, y + startY)
    } else {
      throw new Error('只支持0 <= 颜色弧度 <= 180')
    }
    grd.addColorStop(0, color1)
    grd.addColorStop(1, color2)
  }
  return grd
}

/**
 * 根据文字对齐方式设置坐标
 * @param {*} imgPath
 * @param {*} index
 * @returns  { Promise }
 */
export function getTextX (textAlign, x, width) {
  let newX = x
  if (textAlign === 'center') {
    newX = width / 2 + x
  } else if (textAlign === 'right') {
    newX = width + x
  }
  return newX
}
