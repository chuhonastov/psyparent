// jsPDF can render HTML and SVG through optional libraries. Kora draws only text, so those imports resolve here
// and the libraries never reach the bundle.
export default function unavailable():never{throw new Error('Not available in Kora');}
