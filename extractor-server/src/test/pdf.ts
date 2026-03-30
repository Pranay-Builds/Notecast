import "dotenv/config";
import { extractFromPDF } from "../extractors/pdf";

async function main() {
  const url = "https://static.pw.live/5eb393ee95fab7468a79d189/GLOBAL_CMS_BLOGS/3e49aeb9-2909-430f-bb8e-893df0c1e3d8.pdf";

  const text = await extractFromPDF(url);

  console.log(text.slice(0, 500)); // preview only
}

main();