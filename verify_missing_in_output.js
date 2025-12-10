
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.resolve(__dirname, 'cleaned_bom_list_v2.csv');

function checkOutput() {
    console.log('Searching in Output File...');
    // Read directly as UTF-8
    const content = fs.readFileSync(OUTPUT_FILE, 'utf8');

    // Search for keywords
    // User said: "프레쉬 + 로맨틱", but Source had "로맨틱 + 프레쉬"
    const keyword1 = "페디슨_헤어세럼";
    const keyword2 = "프레쉬";

    const lines = content.split('\n');
    let found = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(keyword1) && line.includes(keyword2)) {
            console.log(`[FOUND OUTPUT] Line ${i + 1}: ${line}`);
            found = true;
        }
    }

    if (!found) {
        console.log('❌ NOT FOUND in output file.');
    } else {
        console.log('✅ It IS in the file!');
    }
}

checkOutput();
