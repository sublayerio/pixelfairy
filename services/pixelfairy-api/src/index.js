const pkg = require('../package.json')
const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const app = express()
const auth = require('./middleware/auth')
const handleCreateDiffReport = require('./handleCreateDiffReport')

const PORT = process.env.PORT || 3000

app.use(
    morgan('combined')
)

app.use('/assets', express.static(__dirname + '/assets'))

app.post('/create', bodyParser.json(), async (req, res) => {

    const result = await handleCreateDiffReport({
        prevUrl: req.body.prevUrl,
        nextUrl: req.body.nextUrl,
    })

    res.send({
        status: 'success',
        data: result
    })
})

app.get("/", (req, res) => {
    res.send({
        name: pkg.name,
        version: pkg.version
    })
})

app.listen(PORT, () =>
    console.log(`${pkg.name}@${pkg.version} running at port ${PORT}`)
)