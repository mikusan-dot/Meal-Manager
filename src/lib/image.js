/** Shrink phone photos before upload (typical 4 MB → ~250 KB) so receipts upload fast on mobile data. */
export async function shrinkImage(file, maxDim = 1600, quality = 0.8) {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}
