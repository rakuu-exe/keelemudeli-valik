/**
 * Creates the Google Form of the human evaluation (PLAN.md phase 8.4, [M14]) from sample.csv.
 *
 * How to use (the author, in their own Google account):
 *   1. Upload results/human/sample.csv and tools/apps_script/rater_guide.txt to Google Drive
 *      (My Drive; without converting them to Google Sheets or Docs).
 *   2. https://script.google.com → New project → paste this file → Save.
 *   3. Run createForm and allow the access it asks for (Forms, Drive).
 *   4. The log (Execution log) shows the link for the raters and the edit link.
 *
 * The form: the rater guide as the description; the question "Hindaja" (1 or 2); then every answer
 * of sample.csv on its own page, in the order of sample.csv (already shuffled with a fixed seed):
 * a required question titled with the answer ID (the source text, the task and the answer in its
 * description; choices 0, 1, 2) and an optional comment "<ID> kommentaar". The form's own shuffle is
 * not used, because it would separate a comment from its answer. src/human/import.js reads the
 * responses (.csv) back by these titles. The texts that the raters see are in Estonian.
 */
const SAMPLE_FILE = 'sample.csv';
const GUIDE_FILE = 'rater_guide.txt';
const SAMPLE_HEADER = ['answerId', 'sourceText', 'task', 'answer'];
const FORM_TITLE = 'Keelemudelite vastuste hindamine';
const RATER_TITLE = 'Hindaja';
const SCORES = ['0 – vale', '1 – osaliselt õige', '2 – õige'];

function createForm() {
  const rows = parseCsv_(readDriveFile_(SAMPLE_FILE));
  const header = rows.shift();
  if (JSON.stringify(header) !== JSON.stringify(SAMPLE_HEADER)) {
    throw new Error('Unexpected header in ' + SAMPLE_FILE + ': ' + header.join(','));
  }
  rows.forEach(function (row, i) {
    if (row.length !== SAMPLE_HEADER.length) throw new Error('Row ' + (i + 2) + ' of ' + SAMPLE_FILE + ' has ' + row.length + ' fields');
  });
  const guide = readDriveFile_(GUIDE_FILE).trim();

  const form = FormApp.create(FORM_TITLE);
  form.setDescription(guide)
    .setProgressBar(true)
    .setCollectEmail(false)
    .setAllowResponseEdits(true)
    .setShuffleQuestions(false)
    .setConfirmationMessage('Aitäh! Sinu hinnangud on salvestatud.');

  form.addMultipleChoiceItem()
    .setTitle(RATER_TITLE)
    .setHelpText('Vali hindaja number, mille said uurijalt.')
    .setChoiceValues(['1', '2'])
    .setRequired(true);

  rows.forEach(function (row) {
    const id = row[0];
    const answer = row[3].trim() === '' ? '(tühi vastus)' : row[3];
    form.addPageBreakItem().setTitle(id);
    form.addMultipleChoiceItem()
      .setTitle(id)
      .setHelpText('LÄHTETEKST\n' + row[1] + '\n\nÜLESANNE\n' + row[2] + '\n\nVASTUS\n' + answer)
      .setChoiceValues(SCORES)
      .setRequired(true);
    form.addParagraphTextItem()
      .setTitle(id + ' kommentaar')
      .setRequired(false);
  });

  if (form.supportsAdvancedResponderPermissions() && !form.isPublished()) form.setPublished(true);
  Logger.log(rows.length + ' answers.');
  Logger.log('Link for the raters: ' + form.getPublishedUrl());
  Logger.log('Edit link (only for the author): ' + form.getEditUrl());
}

// The only file with this name in Drive, as UTF-8 text (not a converted Google Sheets or Docs file).
function readDriveFile_(name) {
  const found = [];
  const files = DriveApp.getFilesByName(name);
  while (files.hasNext()) {
    const f = files.next();
    if (!f.isTrashed()) found.push(f); // a file in the bin does not count
  }
  if (found.length === 0) throw new Error('No file "' + name + '" in Google Drive: upload it first.');
  if (found.length > 1) throw new Error('More than one file "' + name + '" in Google Drive: keep only one.');
  const file = found[0];
  // An uploaded .csv is 'text/csv' or, from Windows with Excel installed, 'application/vnd.ms-excel';
  // both are the text as uploaded. Only a file converted to Google Sheets or Docs has no text.
  const type = file.getMimeType();
  if (type.indexOf('application/vnd.google-apps') === 0) {
    throw new Error('"' + name + '" is ' + type + ', not a text file: upload it again without converting it.');
  }
  return file.getBlob().getDataAsString('UTF-8').replace(/^﻿/, '');
}

// CSV (RFC 4180) as in src/csv.js: comma separated; a quoted field may contain commas, quotes ("")
// and line breaks. Returns the rows as arrays of strings.
function parseCsv_(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (quoted) throw new Error('CSV: unterminated quoted field');
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}
