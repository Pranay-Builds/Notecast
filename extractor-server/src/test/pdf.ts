import "dotenv/config";
import { extractFromPDF } from "../extractors/pdf";

async function main() {
  const url = "https://drive.google.com/uc?export=download&id=1scLZRTol0xAZkK_GUlaySUYsvCDt9WDP";

  const text = await extractFromPDF(url);

  console.log(text.slice(0, 500)); // preview only
}

main();