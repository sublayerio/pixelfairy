module.exports = (data) => {

    const html = `
    <html>
    <head>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css" integrity="sha512-NhSC1YmyruXifcj/KFRWoC561YpHpc5Jtzgvbuzx5VozKpWvQ+4nXhPdFgmx8xqexRcpAglTj9sIBWINXa8x5w==" crossorigin="anonymous" />
    <style>
        body {
            font-family: sans-serif;
            background-color: #f2f2f2;
        }
        .button {
            background: #fff;
            color: #000;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 4px 12px;
            cursor: pointer;
        }
        .button.active {
            background: #000;
            color: #fff;
            border: 1px solid #000;
        }
    </style>
    </head>
    <body>
    <script>
        var results = ${JSON.stringify(data.results)}
        function preloadImage(url) {
            var img = new Image()
            img.src = url
        }

        let state = { type: 'diff' }
        const types = ['prev', 'next', 'diff']

        function handleKeyDown(e) {

            if (!["ArrowLeft", "ArrowRight"].includes(e.key)) {
                return
            }
            
            console.log(e)

            const currentIndex = types.indexOf(state.type)

            const nextIndex = e.key === "ArrowLeft" ? 
                (currentIndex === 0 ? types.length - 1 : currentIndex - 1) : 
                (currentIndex === types.length - 1 ? 0 : currentIndex + 1)

            console.log({
                currentIndex,
                nextIndex
            })
            
            state.type = types[nextIndex]

            show(state.type)
        }


        document.addEventListener('keydown', handleKeyDown)

        results.forEach(result => {
            preloadImage(result.prevUrl)
            preloadImage(result.nextUrl)
            preloadImage(result.diffUrl)
        })

        function show(type) {
            const images = document.querySelectorAll('.preview')
            images.forEach(image => {
                image.src = image.getAttribute(\`data-\${type}-src\`)
            })
            const prevButton = document.querySelector('#prev-button')
            const nextButton = document.querySelector('#next-button')
            const diffButton = document.querySelector('#diff-button')
            prevButton.classList = "button"
            nextButton.classList = "button"
            diffButton.classList = "button"

            if (type === "prev") {
                prevButton.classList = "button active"
            }
            if (type === "next") {
                nextButton.classList = "button active"
            }
            if (type === "diff") {
                diffButton.classList = "button active"
            }
        }
    </script>
    <div style="">
    ${data.results.map(result => {
        return `
            <div style="height: 100vh; width: 100%; position: relative;">
                <div style="position: absolute; top: 75px; left: 0; right: 0; bottom: 15px;">
                    <img 
                        class="preview"
                        src="${result.diffUrl}" 
                        data-prev-src="${result.prevUrl}" 
                        data-next-src="${result.nextUrl}" 
                        data-diff-src="${result.diffUrl}" 
                        style="height: 100%; max-width: 100%; margin: 0 auto; display: block;"
                    />
                </div>
            </div>
            `
    }).join('')}
        <div style="display: flex; align-items: center; padding: 0 16px; position: fixed; height: 60px; top: 0; left: 0; right: 0; background-color: #fff; box-shadow: rgba(0, 0, 0, 0.05) 0px 2px 5px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px;">
        <div style="font-family: Helvetica; font-size: 28px; font-weight: bold; margin-right: 16px;">
        🧚🏻‍♀️ pixelfairy
        </div>
            <button class="button" id="prev-button" onClick="show('prev')">prev</button>&nbsp;
            <button class="button" id="next-button" onClick="show('next')">next</button>&nbsp;
            <button class="button active" id="diff-button" onClick="show('diff')">diff</button>&nbsp;
            ${data.results.length} pages
            <div style="margin-left: auto;">
            <strong>💡 protip:</strong> arrow keys can be used to switch images
            </div>
        </div>
    </div>
    </body>
    </html>
`

    return html
}