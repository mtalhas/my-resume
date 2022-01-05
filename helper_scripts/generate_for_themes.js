const { execSync } = require("child_process");
const fs = require('fs');
const path = require('path');

// Reads command line arguments
var myArgs = process.argv.slice(2);
console.log('myArgs: ', myArgs);

const themesToLoad = [
    "flat",
    "slick",
    "paper",
    "kendall",
    "modern",
    "kwan",
    "stackoverflow",
    "spartan",
    "class",
    "caffeine",
    "even",
    "elegant",
    "eloquent"
];

// Generate theme based static and pdf resumes
for (let i = 0; i < themesToLoad.length; i++) {
    let commands = [
        `node node_modules/resume-cli/build/main.js export ${themesToLoad[i]}.html --format html --theme ${themesToLoad[i]}`,
        `node node_modules/resume-cli/build/main.js export ${themesToLoad[i]}.pdf --format pdf --theme ${themesToLoad[i]}`,
        `node helper_scripts/add_download_resume_link.js ${themesToLoad[i]}.html ./${themesToLoad[i]}.pdf`
    ];

    commands.forEach(element => {
        execSync(element);
    });
}

// Read files to sort out under public directory
fs.readdir(path.resolve(myArgs[0]), (error, fileNames) => {
    if (error) throw error;

    fileNames.forEach(filename => {
        // get current file name
        const name = path.parse(filename).name;
        // get current file extension
        const ext = path.parse(filename).ext;

        if (name.startsWith('out_') && ext === '.html') {
            console.log(name);

            // get current file path
            const filepath = path.resolve(path.resolve(myArgs[0]), filename);

            // Move the selected file to public
            fs.renameSync(filepath, path.join(path.resolve(myArgs[0]), 'public', filename));
        }

        if (ext === '.pdf') {
            console.log(name);

            // get current file path
            const filepath = path.resolve(path.resolve(myArgs[0]), filename);

            // Move the selected file to public
            fs.renameSync(filepath, path.join(path.resolve(myArgs[0]), 'public', filename));
        }
    });
});