const fs = require('fs')
const uuid = require('uuid')
const axios = require('axios')
var PDFImage = require("pdf-image").PDFImage
const mkdirp = require('mkdirp')
const PNG = require("pngjs").PNG
const pixelmatch = require("pixelmatch")
const times = require('lodash/times')
const createReport = require('./createReport')

const createDiffImage = async ({ result }) => {

    if (!result.diffPath) {
        return null
    }

    const img1 = PNG.sync.read(
        fs.readFileSync(result.prevPath)
    );
    const img2 = PNG.sync.read(
        fs.readFileSync(result.nextPath)
    );

    const { width, height } = img1
    const diff = new PNG({ width, height })

    pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });

    fs.writeFileSync(result.diffPath, PNG.sync.write(diff));
}

const createDiffImages = ({ outputPath, results }) => results.map((result, index) => createDiffImage({ index, result, outputPath }))

const createImages = async ({ filePath, convertOptions }) => {

    const pdfImage = new PDFImage(filePath, {
        convertOptions
    })

    const result = await pdfImage.convertFile().catch(e => {
        log(e)
    })

    return result
}

const createDiffReport = data => {

    const html = createReport(data)

    fs.writeFileSync(data.diffReportPath, html)
}

const fetchFile = (url) =>
    axios
        .get(url, { responseType: "arraybuffer" })
        .then((response) => Buffer.from(response.data, "binary"));

module.exports = async ({ prevUrl, nextUrl, convertOptions = {} }, log) => {

    const convertDensity = convertOptions.density

    const _convertOptions = {
        "-background": "white",
        "-flatten": "",
        "-density": convertDensity || process.env.CONVERT_DENSITY || "50",
        "-quality": "100"
    }

    
    const id = uuid.v4()
    const outputPath = `${__dirname}/assets/${id}`
    
    log(`[${id}] start with convertOptions: ${JSON.stringify(_convertOptions)}`)

    await mkdirp(outputPath)

    const prevFilePath = `${outputPath}/prev.pdf`
    const nextFilePath = `${outputPath}/next.pdf`

    const createFetchFileError = (field) => (e) => {
        throw new Error(`Could not fetch file for field: ${field}, ${e.message}`);
    };

    log(`[${id}] fetch prevUrl [start] ${prevUrl}`)

    const prevFile = await fetchFile(prevUrl).catch(
        createFetchFileError("prevUrl")
    );

    log(`[${id}] fetch prevUrl [success] ${prevUrl}`)
    log(`[${id}] fetch nextUrl [start] ${nextUrl}`)

    const nextFile = await fetchFile(nextUrl).catch(
        createFetchFileError("nextUrl")
    );

    log(`[${id}] fetch nextUrl [success] ${nextUrl}`)

    log(`[${id}] write prevFile [start] ${prevFilePath}`)
    fs.writeFileSync(prevFilePath, prevFile)
    log(`[${id}] write prevFile [success] ${prevFilePath}`)
    log(`[${id}] write nextFile [start] ${nextFilePath}`)
    fs.writeFileSync(nextFilePath, nextFile)
    log(`[${id}] write nextFile [success] ${nextFilePath}`)

    log(`[${id}] create prevImages [start]`)
    const prevImages = await createImages({
        filePath: prevFilePath,
        outputPath,
        convertOptions: _convertOptions
    })
    log(`[${id}] create prevImages [success]: ${prevImages.length} pages found`)

    log(`[${id}] create nextImages [start]`)
    const nextImages = await createImages({
        filePath: nextFilePath,
        outputPath,
        convertOptions: _convertOptions
    })
    log(`[${id}] create nextImages [success]: ${nextImages.length} pages found`)

    const count = Math.max(prevImages.length, nextImages.length)

    const results = times(count).map(index => {

        const prevPath = prevImages[index] ? `${__dirname}/assets/${id}/prev-${index}.png` : null
        const nextPath = nextImages[index] ? `${__dirname}/assets/${id}/next-${index}.png` : null
        const prevUrl = prevPath ? `${process.env.HOST}/assets/${id}/prev-${index}.png` : null
        const nextUrl = nextPath ? `${process.env.HOST}/assets/${id}/next-${index}.png` : null
        const diffPath = prevPath && nextPath ? `${outputPath}/diff-${index}.png` : null
        const diffUrl = diffPath ? `${process.env.HOST}/assets/${id}/diff-${index}.png` : null

        return {
            prevPath,
            nextPath,
            diffPath,
            prevUrl,
            nextUrl,
            diffUrl
        }
    })
    log(`[${id}] create diffImages [start] ${count} diffs to create`)

    await createDiffImages({
        results,
        outputPath
    })
    log(`[${id}] create diffImages [success]`)

    const data = {
        diffReportPath: `${__dirname}/assets/${id}/diff-report.html`,
        diffReportUrl: `${process.env.HOST}/assets/${id}/diff-report.html`,
        results
    }

    createDiffReport(data)
    log(`[${id}] done`)

    return data
}