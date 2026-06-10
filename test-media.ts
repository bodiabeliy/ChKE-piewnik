import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const url2 = 'https://www.giszowiec.org/spiewnik/d/1171-duszo-ma-pana-chwal';

  try {
    const res2 = await axios.get(url2);
    const $2 = cheerio.load(res2.data);
    const content = $2('.item-page');
    // Remove unwanted elements
    content.find('.actions, .buttonheading, .print-icon, .email-icon').remove();
    content.find('span.icon-print, span.icon-envelope').parent().parent().remove();
    content.find('div.btn-group').remove();
    
    content.find('br').replaceWith('\\n');
    content.find('p, div, li').each((i, el) => {
      $2(el).prepend('\\n');
      $2(el).append('\\n');
    });

    let text = content.text();
    text = text.replace(/Drukuj/g, '').replace(/E-mail/g, '').replace(/\\[NUTY\\]/g, '');
    text = text.replace(/\\t/g, ' ').replace(/\\n\\s*\\n\\s*\\n/g, '\\n\\n').trim();
    
    console.log("Extracted text:\\n", text.slice(0, 500));
  } catch(e) {
    console.error(e);
  }
}
test();
