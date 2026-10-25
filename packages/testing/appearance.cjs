'use strict'
const path = require('node:path')
/** 浅深色和三个视口使用相同截图节奏，调用方补上组件专属判据。 */
async function captureAppearance(page, directory, prefix, inspect = async () => {}) {
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme })
    for (const width of [1440, 1024, 640]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(150)
      await inspect(width, scheme)
      await page.screenshot({ path: path.join(directory, `${prefix}-${width}-${scheme}.png`) })
    }
  }
}
module.exports = { captureAppearance }
