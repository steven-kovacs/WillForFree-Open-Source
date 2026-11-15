import { currentLanguage, display, hasCopy, sentence, sourcePattern } from "./locale.js";
export const QUESTION_LIMIT=240;

export function shortHelp(text){
  const words=text.trim().split(/\s+/u);
  if(words.length<=60)return text;
  const prefix=words.slice(0,60).join(" ");
  const sentences=[...prefix.matchAll(/[.!?](?:[”’"])?(?=\s|$)/gu)];
  const last=sentences.at(-1);
  if(!last)return "The wording for this step is shown above. Ask about one part at a time and I can explain it.";
  const excerpt=prefix.slice(0,last.index+last[0].length);
  // Shortening a catalog key can otherwise expose a fragment of English in another language.
  return currentLanguage()!=="en" && !hasCopy(excerpt) && hasCopy(sourcePattern(text))?text:excerpt;
}

export function replyLimit(question){
  if(question?.kind==="notes")return 600;
  if(question?.kind==="names")return 650;
  return QUESTION_LIMIT;
}

export function setupLengthHint(field,status){
  const reset=()=>{field.setCustomValidity("");status.textContent="";status.hidden=true;};
  const show=(text,invalid=false)=>{
    status.textContent=text;status.hidden=false;
    if(invalid)field.setCustomValidity(display(text));
  };
  function fits(limit=field.maxLength){
    if(field.value.length<=limit)return true;
    show(sentence("Please shorten this to {0} characters before sending.", limit),true);
    field.focus({preventScroll:true});
    return false;
  }
  // Native maxlength silently shortens pasted content. Refuse the whole paste and keep the original answer editable.
  field.addEventListener("paste",event=>{
    const pasted=event.clipboardData?.getData("text/plain");
    if(!pasted)return;
    const total=field.value.length-field.selectionEnd+field.selectionStart+pasted.replace(/\r\n?/g,"\n").length;
    if(total<=field.maxLength)return;
    event.preventDefault();
    show(sentence("That paste is too long. Use up to {0} characters.", field.maxLength));
  });
  field.addEventListener("input",()=>{
    reset();
    if(!fits())return;
    const left=field.maxLength-field.value.length;
    if(left<=30)show(left===0?"Character limit reached. You can send your answer.":sentence("{0} characters left.", left));
  });
  return {fits,reset};
}
