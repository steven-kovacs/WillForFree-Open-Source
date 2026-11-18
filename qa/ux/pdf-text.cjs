// These browser checks read the document a visitor actually downloads.
const {execFileSync} = require("node:child_process");
const extract = "import io,sys; from pypdf import PdfReader; print(' '.join(' '.join(page.extract_text() or '' for page in PdfReader(io.BytesIO(sys.stdin.buffer.read())).pages).split()))";
function pdfText(bytes) {
  return execFileSync(process.env.WFF_PYTHON || "python3",["-c",extract],{input:bytes,encoding:"utf8"});
}
function kitText(filename,entry) {
  return pdfText(execFileSync("unzip",["-p",filename,entry],{maxBuffer:15*1024*1024}));
}
module.exports={pdfText,kitText};
