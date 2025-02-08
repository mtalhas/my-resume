// export-docx-puppeteer.js

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const {
    Document,
    Packer,
    Paragraph,
    TextRun
} = require('docx');

/*
  PART 1 – Render the HTML with Puppeteer and extract computed styles

  We load the resume.html file (which must be in the same folder)
  and then run a browser-side script that recursively processes the DOM.
  For every element (in our sample, we start from the #resume container)
  we capture the tag name, inner text, and a handful of computed style properties.
  This data is returned as a custom JSON structure and saved to a file (for debugging).
*/
async function extractComputedStyles() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    // Load the local HTML resume file
    const resumePath = 'file://' + path.join(__dirname, 'resume.html');
    await page.goto(resumePath, { waitUntil: 'networkidle0' });
    
    // Execute code in the page to process the DOM.
    const styledData = await page.evaluate(() => {
        // A helper to extract a few computed style properties.
        function getElementStyles(el) {
            const computed = window.getComputedStyle(el);
            return {
                fontSize: computed.fontSize,       // e.g. "12px"
                fontFamily: computed.fontFamily,   // e.g. "Lato, Helvetica, Arial, sans-serif"
                fontWeight: computed.fontWeight,   // e.g. "400" or "700"
                color: computed.color,             // e.g. "rgb(57, 66, 75)"
                backgroundColor: computed.backgroundColor,
                margin: computed.margin,
                padding: computed.padding,
                textAlign: computed.textAlign
            };
        }
        // Recursively process a DOM element.
        function processElement(el) {
            const data = {
                tag: el.tagName,
                text: el.innerText.trim(),
                styles: getElementStyles(el),
                children: []
            };
            for (let child of el.children) {
                data.children.push(processElement(child));
            }
            return data;
        }
        // Start from the resume container. (Adjust the selector if needed.)
        const resumeEl = document.querySelector('#resume');
        return processElement(resumeEl);
    });
    
    await browser.close();
    // Write the computed styles JSON to a file (for debugging or later usage)
    fs.writeFileSync('computedStyles.json', JSON.stringify(styledData, null, 2));
    return styledData;
}

/*
  PART 2 – Map the custom structure to a DOCX document

  This part shows a simple recursive conversion.
  The example uses the docx library to create a document.
  (Note: The mapping from CSS to DOCX isn’t one-to-one, so you may wish to refine the approach.)
  
  In our example, for every node with nonempty text we create a Paragraph
  using a TextRun whose properties (font, size, bold, color) are derived
  from the computed style data.
*/

// Helper: Convert an RGB string (e.g. "rgb(57, 66, 75)") to a hex color string (e.g. "39424B").
function colorHexFromRGB(rgb) {
   const match = /rgba?\((\d+), ?(\d+), ?(\d+)/.exec(rgb);
   if (!match) return "000000";
   return [match[1], match[2], match[3]].map(x => {
       const hex = parseInt(x).toString(16);
       return hex.length === 1 ? "0" + hex : hex;
   }).join('');
}

// Convert one node into a DOCX paragraph.
// You can expand this function to apply more DOCX options based on
// padding, margins, and other style properties.
function nodeToParagraph(node) {
    // Create a TextRun using properties mapped from our computed style.
    // Note: docx sizes are in half-points so we roughly convert pixels to half‑points.
    const textRun = new TextRun({
         text: node.text || '',
         font: node.styles.fontFamily,
         // For a more robust conversion, you might parse the "px" value.
         // Here we simply multiply by 2; adjust as needed.
         size: node.styles.fontSize ? Math.round(parseFloat(node.styles.fontSize) * 2) : 24,
         bold: (node.styles.fontWeight === '700' || node.styles.fontWeight.toLowerCase() === 'bold'),
         color: colorHexFromRGB(node.styles.color)
    });
    return new Paragraph({
         children: [textRun]
    });
}

// Recursively traverse the JSON structure collecting paragraphs.
function convertNodeToParagraphs(node, paragraphs = []) {
    // If the node has nonempty text, add a paragraph.
    if (node.text) {
        paragraphs.push(nodeToParagraph(node));
    }
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            convertNodeToParagraphs(child, paragraphs);
        });
    }
    return paragraphs;
}

// Builds and writes out a DOCX document using the custom JSON structure.
function generateDocxFromData(data) {
    const paragraphs = convertNodeToParagraphs(data);
    
    // Create a new Document with A4 page size and custom margins.
    const doc = new Document({
         sections: [{
              properties: {
                  page: {
                      size: { width: 11906, height: 16838 },
                      margin: {
                          top: 1440 * 0.25,    // 0.25"
                          bottom: 1440 * 0.25,
                          left: 1440 * 0.34,
                          right: 1440 * 0.22,
                      }
                  }
              },
              children: paragraphs
         }]
    });
    
    Packer.toBuffer(doc).then((buffer) => {
         fs.writeFileSync("output.docx", buffer);
         console.log("DOCX generated: output.docx");
    });
}

/*
  MAIN – Run the extraction and conversion

  First we extract the computed styles from the HTML resume via Puppeteer.
  Then we generate a DOCX file whose paragraphs attempt to respect
  the original computed styling.
*/
(async () => {
    try {
        const styledData = await extractComputedStyles();
        console.log("Extracted computed styles from HTML (see computedStyles.json).");
        generateDocxFromData(styledData);
    } catch (error) {
        console.error("Error during conversion:", error);
    }
})();