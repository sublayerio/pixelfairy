const fs = require('fs')
const uuid = require('uuid')
const axios = require('axios')
var PDFImage = require("pdf-image").PDFImage
const mkdirp = require('mkdirp')
const PNG = require("pngjs").PNG
const pixelmatch = require("pixelmatch")
const times = require('lodash/times')

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

const createImages = async ({ filePath }) => {

    const pdfImage = new PDFImage(filePath, {
        convertOptions: {
            "-background": "white",
            "-flatten": "",
            "-density": process.env.CONVERT_DENSITY || "50",
            "-quality": "100"
        }
    })

    const result = await pdfImage.convertFile().catch(e => {
        console.log(e)
    })

    return result
}

const createDiffReport = data => {

    const html = `
        <html>
        <body>
            ${data.results.map(result => {
        return `<img src="${result.diffUrl}" style="height: 100vh; max-width: 100%; margin: 0 auto; display: block;" />`
    })}
        </body>
        </html>
    `

    fs.writeFileSync(data.diffReportPath, html)
}

const fetchFile = (url) =>
    axios
        .get(url, { responseType: "arraybuffer" })
        .then((response) => Buffer.from(response.data, "binary"));

module.exports = async ({ prevUrl, nextUrl }) => {

    const id = 'test2_' + uuid.v4()
    const outputPath = `${__dirname}/assets/${id}`

    await mkdirp(outputPath)

    const prevFilePath = `${outputPath}/prev.pdf`
    const nextFilePath = `${outputPath}/next.pdf`

    const createFetchFileError = (field) => (e) => {
        throw new Error(`Could not fetch file for field: ${field}, ${e.message}`);
    };

    const prevFile = await fetchFile(prevUrl).catch(
        createFetchFileError("prevUrl")
    );
    const nextFile = await fetchFile(nextUrl).catch(
        createFetchFileError("nextUrl")
    );

    fs.writeFileSync(prevFilePath, prevFile)
    fs.writeFileSync(nextFilePath, nextFile)

    const prevImages = await createImages({
        filePath: prevFilePath,
        outputPath
    })

    const nextImages = await createImages({
        filePath: nextFilePath,
        outputPath
    })

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

    await createDiffImages({
        results,
        outputPath
    })

    const data = {
        diffReportPath: `${__dirname}/assets/${id}/diff-report.html`,
        diffReportUrl: `${process.env.HOST}/assets/${id}/diff-report.html`,
        results
    }

    createDiffReport(data)

    return data
}