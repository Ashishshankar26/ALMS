const fs = require('fs');
const cheerio = require('cheerio');

function analyzeFile(filePath) {
    console.log('\n--- Analyzing ' + filePath + ' ---');
    try {
        const html = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(html);
        
        // Find all main navigation links/menus
        const menuItems = new Set();
        $('a').each((i, el) => {
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            const href = $(el).attr('href');
            if (text && text.length > 2 && text.length < 50 && href && href !== '#') {
                menuItems.add(text);
            }
        });
        
        // Find main dashboard widgets or sections
        const sections = new Set();
        $('.panel-heading, .card-header, h1, h2, h3, h4').each((i, el) => {
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (text && text.length > 2 && text.length < 100) {
                sections.add(text);
            }
        });

        console.log('Main Sections / Headings found:');
        console.log(Array.from(sections).slice(0, 30));

        console.log('\nMenu Items / Links found (Sample):');
        console.log(Array.from(menuItems).slice(0, 30));

    } catch(e) {
        console.error('Error analyzing', filePath, e.message);
    }
}

analyzeFile('dashboard.html');
analyzeFile('lpuums.html');
analyzeFile('../makeup.html');
analyzeFile('../results.html');
analyzeFile('../timetable.html');
