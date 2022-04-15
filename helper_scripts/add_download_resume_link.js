const fs = require('fs');
const jsdom = require("jsdom");
const path = require('path');
const { JSDOM } = jsdom;

// Reads command line arguments
var myArgs = process.argv.slice(2);
console.log('myArgs: ', myArgs);

// Prepares the input file path and output file path
const inFileName = path.join(__dirname, '../', myArgs[0]);
const outFileName = path.join(__dirname, '../', 'out_' + myArgs[0]);
const pdfResumePath = myArgs[1];

// Reads the input file to start the manipulation
fs.readFile(inFileName, 'utf8' , (err, data) => {
    // If there is an error, we are done!
    if (err) {
        console.error(err);
        return;
    }

    // Start the manipulation using JSDom object
    const { window } = new JSDOM(data, { runScripts: "outside-only" });

    // Declares the public directory variable
    // const public_dir = "public";

    window.eval(`
        // Load font awesome icons
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"

        // Load styles to support the sticky bar
        var link2 = document.createElement("link");
        link2.rel = "stylesheet";
        link2.href = "./sticky_bar/styles.css"

        document.head.appendChild(link2);
        document.head.appendChild(link);

        // The download bar
        var barDiv = document.createElement("div");
        barDiv.classList.add("icon-bar");

        // The download button
        var downloadButton = document.createElement("a");
        downloadButton.href = "${pdfResumePath}";
        downloadButton.classList.add("youtube");
        downloadButton.id = "resume_download_btn";

        // The download icon
        var downloadIcon = document.createElement("i");
        downloadIcon.classList.add("fa");
        downloadIcon.classList.add("fa-download");

        // Lets mix them together
        downloadButton.appendChild(downloadIcon);
        barDiv.appendChild(downloadButton);
        document.body.insertBefore(barDiv, document.body.childNodes[0]);
    `);

    // Write the prepared file to the output file path
    fs.writeFile(outFileName, window.document.documentElement.outerHTML, function (error){
        if (error) throw error;
    });
});