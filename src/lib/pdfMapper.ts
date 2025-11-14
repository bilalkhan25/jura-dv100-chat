import { PDFDocument, PDFCheckBox } from 'pdf-lib';
import { getAtPath } from './objectPath';
import type { Dv100Data } from './dv100State';

const PDF_URL = new URL('../assets/forms/DV-100-official.pdf.pdf', import.meta.url).href;
const MAPPING_URL = new URL('../assets/forms/DV-100-fieldmapping.txt.txt', import.meta.url).href;

function parseMapping(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[A-Za-z0-9_.#]+$/.test(line));
}

async function loadAssets() {
  const [pdfResponse, mapResponse] = await Promise.all([fetch(PDF_URL), fetch(MAPPING_URL)]);

  if (!pdfResponse.ok) {
    throw new Error('Failed to load DV-100 PDF template.');
  }

  if (!mapResponse.ok) {
    throw new Error('Failed to load DV-100 field mapping.');
  }

  const [pdfBytes, mapText] = await Promise.all([pdfResponse.arrayBuffer(), mapResponse.text()]);
  return { pdfBytes, mapping: parseMapping(mapText) };
}

function coerceFieldValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? '' : String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

export async function fillDv100Pdf(dv100Data: Dv100Data, derivedData: Record<string, unknown>) {
  const { pdfBytes, mapping } = await loadAssets();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const getField = (name: string) => {
    try {
      return form.getField(name);
    } catch {
      return null;
    }
  };

  mapping.forEach((fieldName) => {
    const derivedValue = getAtPath(derivedData, fieldName);
    const sourceValue = derivedValue ?? getAtPath(dv100Data, fieldName);

    try {
      const field = getField(fieldName);

      if (!field) {
        return;
      }

      if (typeof sourceValue === 'boolean' && field instanceof PDFCheckBox) {
        if (sourceValue) {
          field.check();
        } else {
          field.uncheck();
        }
        return;
      }

      const textField = field as { setText?: (text: string) => void };
      if (typeof textField.setText === 'function') {
        textField.setText(coerceFieldValue(sourceValue));
      }
    } catch (error) {
      console.warn(`Unable to set PDF field: ${fieldName}`, error);
    }
  });

  const filledBytes = await pdfDoc.save();
  const byteArray = new Uint8Array(filledBytes);
  return new Blob([byteArray], { type: 'application/pdf' });
}
