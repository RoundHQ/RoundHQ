type CustomerType = "Residential" | "Commercial";

type LineItem = {
    id: string;
    description: string;
    quantity: number;
    price: number;
};

type DocumentCustomerFields = {
    customerType?: CustomerType;
    customerAddress?: string;
    customerTown?: string;
    customerPostcode?: string;
    siteName?: string;
    siteAddress?: string;
    siteTown?: string;
    sitePostcode?: string;
};

export type PdfTemplateQuote = DocumentCustomerFields & {
    id: string;
    quoteNumber: string;
    customerId: number | null;
    customerName: string;
    date: string;
    status: string;
    items: LineItem[];
    notes?: string;
    total: number;
};

export type PdfTemplateInvoice = DocumentCustomerFields & {
    id: string;
    invoiceNumber: string;
    customerId: number | null;
    customerName: string;
    date: string;
    dueDate?: string;
    status: string;
    items: LineItem[];
    notes?: string;
    terms?: string;
    vatRate?: number;
    vatAmount?: number;
    total: number;
    linkedQuoteId?: string;
};

export type PdfTemplateBrandDetails = {
    businessName?: string;
    tradingName?: string;
    businessEmail?: string;
    businessPhone?: string;
    website?: string;
    addressLine1?: string;
    addressLine2?: string;
    townCity?: string;
    county?: string;
    postcode?: string;
    termsAndConditionsUrl?: string;
    defaultQuoteTerms?: string;
    defaultInvoiceTerms?: string;
    bankAccountName?: string;
    bankSortCode?: string;
    bankAccountNumber?: string;
    bankPaymentReference?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
};

type TemplateValues = Record<string, string>;

const GBP_SYMBOL = String.fromCharCode(163);

export const STARTER_QUOTE_PDF_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #ffffff;
      color: {{ink_color}};
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      padding: 18px 44px 24px;
      background: #ffffff;
    }
    .header {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 22px;
    }
    .header-cell {
      display: table-cell;
      vertical-align: top;
    }
    .header-right {
      width: 220px;
      text-align: right;
    }
    .logo {
      min-height: 48px;
    }
    .logo img {
      max-width: 250px;
      max-height: 48px;
      object-fit: contain;
    }
    .brand-fallback {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: {{secondary_color}};
    }
    .meta-label {
      margin: 0 0 4px;
      color: #7c8a97;
      font-size: 12px;
      line-height: 1.3;
    }
    .meta-value {
      margin: 0;
      color: {{secondary_color}};
      font-size: 14px;
      line-height: 1.35;
      font-weight: 700;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    .info-band {
      background: {{secondary_color}};
      color: {{secondary_text_color}};
      padding: 22px 28px;
      margin-bottom: 30px;
      font-size: 13px;
    }
    .info-grid {
      display: table;
      width: 100%;
      table-layout: fixed;
    }
    .info-col {
      display: table-cell;
      width: 50%;
      vertical-align: top;
    }
    .info-col.right {
      text-align: right;
    }
    .info-name {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 700;
    }
    .info-copy {
      margin: 0;
      line-height: 1.6;
      white-space: pre-line;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 26px;
      font-size: 13px;
    }
    .items-table thead th {
      border-bottom: 2px solid {{secondary_color}};
      padding: 0 10px 12px;
      color: {{secondary_color}};
      font-size: 12px;
      font-weight: 700;
      text-align: left;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .items-table thead th.qty,
    .items-table thead th.price,
    .items-table thead th.total {
      text-align: right;
    }
    .items-table tbody td {
      border-bottom: 1px solid {{border_color}};
      padding: 14px 10px;
      vertical-align: top;
      color: #404040;
    }
    .items-table tbody td.qty,
    .items-table tbody td.price,
    .items-table tbody td.amount {
      text-align: right;
      white-space: nowrap;
    }
    .total-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 34px;
    }
    .total-box {
      display: table;
      width: 240px;
      border-collapse: collapse;
      background: {{secondary_color}};
      color: #ffffff;
    }
    .total-label,
    .total-value {
      display: table-cell;
      padding: 14px 16px;
      font-size: 14px;
      font-weight: 700;
    }
    .total-value {
      text-align: right;
    }
    .terms {
      color: #404040;
      font-size: 13px;
      line-height: 1.7;
    }
    .terms h3 {
      margin: 0 0 8px;
      color: {{secondary_color}};
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .terms p {
      margin: 0;
      white-space: pre-line;
    }
    .footer {
      margin-top: 38px;
      background: {{secondary_color}};
      color: {{secondary_text_color}};
      padding: 10px 16px;
      text-align: center;
      font-size: 11px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-cell">
        <div class="logo">{{logo_markup}}</div>
      </div>
      <div class="header-cell header-right">
        <div class="meta-grid">
          <div>
            <p class="meta-label">Date</p>
            <p class="meta-value">{{document_date}}</p>
          </div>
          <div>
            <p class="meta-label">{{document_title}} #</p>
            <p class="meta-value">{{document_number}}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="info-band">
      <div class="info-grid">
        <div class="info-col">
          <p class="info-name">{{business_name}}</p>
          <p class="info-copy">Tel: {{business_phone}}<br />Email: {{business_email}}<br />{{business_website}}</p>
        </div>
        <div class="info-col right">
          <p class="info-name">{{customer_name}}</p>
          <p class="info-copy">{{customer_address}}<br />{{customer_location}}</p>
        </div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="qty">Quantity</th>
          <th class="price">Price</th>
          <th class="total">Total</th>
        </tr>
      </thead>
      <tbody>
        {{items_rows}}
      </tbody>
    </table>

    <div class="total-wrap">
      <div class="total-box">
        <div class="total-label">Total</div>
        <div class="total-value">{{total}}</div>
      </div>
    </div>

    <div class="terms">
      <h3>Terms & Conditions</h3>
      <p>{{terms}}</p>
    </div>

    <div class="footer">
      {{business_name}} | {{business_email}} | {{business_phone}}
    </div>
  </div>
</body>
</html>`;

export const STARTER_INVOICE_PDF_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #ffffff;
      color: {{ink_color}};
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      padding: 18px 44px 24px;
      background: #ffffff;
    }
    .header {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 22px;
    }
    .header-cell {
      display: table-cell;
      vertical-align: top;
    }
    .header-right {
      width: 220px;
      text-align: right;
    }
    .logo {
      min-height: 48px;
    }
    .logo img {
      max-width: 250px;
      max-height: 48px;
      object-fit: contain;
    }
    .brand-fallback {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: {{secondary_color}};
    }
    .meta-label {
      margin: 0 0 4px;
      color: #7c8a97;
      font-size: 12px;
      line-height: 1.3;
    }
    .meta-value {
      margin: 0;
      color: {{secondary_color}};
      font-size: 14px;
      line-height: 1.35;
      font-weight: 700;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    .info-band {
      background: {{secondary_color}};
      color: {{secondary_text_color}};
      padding: 22px 28px;
      margin-bottom: 30px;
      font-size: 13px;
    }
    .info-grid {
      display: table;
      width: 100%;
      table-layout: fixed;
    }
    .info-col {
      display: table-cell;
      width: 50%;
      vertical-align: top;
    }
    .info-col.right {
      text-align: right;
    }
    .info-name {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 700;
    }
    .info-copy {
      margin: 0;
      line-height: 1.6;
      white-space: pre-line;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 26px;
      font-size: 13px;
    }
    .items-table thead th {
      border-bottom: 2px solid {{secondary_color}};
      padding: 0 10px 12px;
      color: {{secondary_color}};
      font-size: 12px;
      font-weight: 700;
      text-align: left;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .items-table thead th.qty,
    .items-table thead th.price,
    .items-table thead th.total {
      text-align: right;
    }
    .items-table tbody td {
      border-bottom: 1px solid {{border_color}};
      padding: 14px 10px;
      vertical-align: top;
      color: #404040;
    }
    .items-table tbody td.qty,
    .items-table tbody td.price,
    .items-table tbody td.amount {
      text-align: right;
      white-space: nowrap;
    }
    .total-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 28px;
    }
    .total-box {
      display: table;
      width: 240px;
      border-collapse: collapse;
      background: {{secondary_color}};
      color: #ffffff;
    }
    .total-label,
    .total-value {
      display: table-cell;
      padding: 14px 16px;
      font-size: 14px;
      font-weight: 700;
    }
    .total-value {
      text-align: right;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 26px;
    }
    .section {
      color: #404040;
      font-size: 13px;
      line-height: 1.7;
    }
    .section h3 {
      margin: 0 0 8px;
      color: {{secondary_color}};
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .section p {
      margin: 0;
      white-space: pre-line;
    }
    .footer {
      margin-top: 38px;
      background: {{secondary_color}};
      color: {{secondary_text_color}};
      padding: 10px 16px;
      text-align: center;
      font-size: 11px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-cell">
        <div class="logo">{{logo_markup}}</div>
      </div>
      <div class="header-cell header-right">
        <div class="meta-grid">
          <div>
            <p class="meta-label">Date</p>
            <p class="meta-value">{{document_date}}</p>
          </div>
          <div>
            <p class="meta-label">{{document_title}} #</p>
            <p class="meta-value">{{document_number}}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="info-band">
      <div class="info-grid">
        <div class="info-col">
          <p class="info-name">{{business_name}}</p>
          <p class="info-copy">Tel: {{business_phone}}<br />Email: {{business_email}}<br />{{business_website}}</p>
        </div>
        <div class="info-col right">
          <p class="info-name">{{customer_name}}</p>
          <p class="info-copy">{{customer_address}}<br />{{customer_location}}</p>
        </div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="qty">Quantity</th>
          <th class="price">Price</th>
          <th class="total">Total</th>
        </tr>
      </thead>
      <tbody>
        {{items_rows}}
      </tbody>
    </table>

    <div class="total-wrap">
      <div class="total-box">
        <div class="total-label">Total</div>
        <div class="total-value">{{total}}</div>
      </div>
    </div>

    <div class="details-grid">
      <div class="section">
        <h3>Payment Details</h3>
        <p>Account Name: {{bank_account_name}}<br />Account Number: {{bank_account_number}}<br />Sort Code: {{bank_sort_code}}</p>
      </div>

      <div class="section">
        <h3>Terms & Conditions</h3>
        <p>{{terms}}</p>
      </div>
    </div>

    <div class="footer">
      {{business_name}} | {{business_email}} | {{business_phone}}
    </div>
  </div>
</body>
</html>`;

export const PDF_TEMPLATE_TOKEN_GROUPS = [
    {
        label: "Core",
        tokens: [
            "document_title",
            "document_number",
            "document_date",
            "status",
            "customer_name",
            "customer_type",
            "customer_address",
            "customer_location",
            "total",
        ],
    },
    {
        label: "Branding",
        tokens: [
            "logo_url",
            "logo_markup",
            "business_name",
            "business_address",
            "business_email",
            "business_phone",
            "business_website",
            "primary_color",
            "secondary_color",
            "primary_text_color",
            "secondary_text_color",
        ],
    },
    {
        label: "Content",
        tokens: [
            "items_rows",
            "summary_rows",
            "notes",
            "notes_html",
            "terms",
            "terms_html",
            "business_details_section",
            "service_location_section",
            "notes_section",
            "terms_section",
        ],
    },
    {
        label: "Invoice extras",
        tokens: [
            "due_date",
            "subtotal",
            "vat_rate",
            "vat_amount",
            "bank_account_name",
            "bank_sort_code",
            "bank_account_number",
            "payment_reference",
            "bank_details_section",
        ],
    },
];

function escapeHtml(value: string | undefined | null) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatMoney(value: number) {
    return `${GBP_SYMBOL}${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: string | undefined) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB");
}

function normalizeOptionalText(value: string | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : "";
}

function joinLines(lines: Array<string | undefined>) {
    return lines.filter(Boolean).join("\n");
}

function buildLocationLine(town?: string, postcode?: string) {
    return [normalizeOptionalText(town), normalizeOptionalText(postcode)]
        .filter(Boolean)
        .join(", ");
}

function buildBusinessName(details: PdfTemplateBrandDetails) {
    return (
        normalizeOptionalText(details.tradingName) ||
        normalizeOptionalText(details.businessName) ||
        "Your Business"
    );
}

function buildBusinessAddress(details: PdfTemplateBrandDetails) {
    return joinLines([
        normalizeOptionalText(details.addressLine1),
        normalizeOptionalText(details.addressLine2),
        [normalizeOptionalText(details.townCity), normalizeOptionalText(details.county)]
            .filter(Boolean)
            .join(", "),
        normalizeOptionalText(details.postcode),
    ]);
}

function buildCustomerAddress(document: DocumentCustomerFields) {
    return normalizeOptionalText(document.customerAddress);
}

function buildCustomerLocation(document: DocumentCustomerFields) {
    return buildLocationLine(document.customerTown, document.customerPostcode);
}

function buildSiteLocation(document: DocumentCustomerFields) {
    return buildLocationLine(document.siteTown, document.sitePostcode);
}

function getSubtotal(items: LineItem[]) {
    return Math.round(
        items.reduce(
            (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
            0
        ) * 100
    ) / 100;
}

function normalizeHexColor(value: string | undefined, fallback: string) {
    const candidate = value?.trim();

    if (!candidate) {
        return fallback;
    }

    const normalized = candidate.startsWith("#") ? candidate : `#${candidate}`;
    const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

    if (!match) {
        return fallback;
    }

    if (match[1].length === 3) {
        const [r, g, b] = match[1].split("");
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }

    return normalized.toLowerCase();
}

function hexToRgb(hex: string) {
    const normalized = normalizeHexColor(hex, "#000000").replace("#", "");
    return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16),
    };
}

function getContrastingTextColor(hex: string) {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? "#0f172a" : "#ffffff";
}

function getPalette(details: PdfTemplateBrandDetails) {
    const primary = normalizeHexColor(details.primaryColor, "#d7ff00");
    const secondary = normalizeHexColor(details.secondaryColor, "#153c3f");

    return {
        primary,
        secondary,
        primaryText: getContrastingTextColor(primary),
        secondaryText: getContrastingTextColor(secondary),
        ink: "#102128",
        muted: "#5f7280",
        border: "#d7e3e6",
        surface: "#f4f8f7",
    };
}

function escapeMultilineHtml(value: string | undefined) {
    return escapeHtml(normalizeOptionalText(value)).replace(/\n/g, "<br />");
}

function buildLogoMarkup(details: PdfTemplateBrandDetails) {
    const logoUrl = normalizeOptionalText(details.logoUrl);

    if (logoUrl) {
        return `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(
            buildBusinessName(details)
        )}" />`;
    }

    return `<div class="brand-fallback">${escapeHtml(buildBusinessName(details))}</div>`;
}

function buildItemsRows(items: LineItem[]) {
    return items
        .map((item) => {
            const quantity = Number(item.quantity || 0);
            const price = Number(item.price || 0);
            const amount = quantity * price;

            return `<tr>
  <td>${escapeHtml(item.description)}</td>
  <td class="qty">${escapeHtml(String(quantity))}</td>
  <td class="price">${escapeHtml(formatMoney(price))}</td>
  <td class="amount">${escapeHtml(formatMoney(amount))}</td>
</tr>`;
        })
        .join("");
}

function buildSummaryRows(rows: Array<{ label: string; value: string; total?: boolean }>) {
    return rows
        .map(
            (row) => `<div class="summary-row${row.total ? " total" : ""}">
  <span>${escapeHtml(row.label)}</span>
  <strong>${escapeHtml(row.value)}</strong>
</div>`
        )
        .join("");
}

function buildSectionCard(title: string, contentHtml: string) {
    return `<div class="stack-card">
  <div class="section-label">${escapeHtml(title)}</div>
  <div class="copy">${contentHtml}</div>
</div>`;
}

function buildBusinessDetailsSection(details: PdfTemplateBrandDetails) {
    const lines = [
        buildBusinessName(details),
        buildBusinessAddress(details),
        joinLines([
            normalizeOptionalText(details.businessPhone),
            normalizeOptionalText(details.businessEmail),
            normalizeOptionalText(details.website),
        ]),
    ]
        .filter(Boolean)
        .join("\n");

    return lines ? buildSectionCard("Business Details", escapeMultilineHtml(lines)) : "";
}

function buildServiceLocationSection(document: DocumentCustomerFields) {
    if (document.customerType !== "Commercial") {
        return "";
    }

    const lines = joinLines([
        normalizeOptionalText(document.siteName),
        normalizeOptionalText(document.siteAddress),
        buildSiteLocation(document),
    ]);

    return lines ? buildSectionCard("Service Location", escapeMultilineHtml(lines)) : "";
}

function buildNotesSection(notes: string | undefined) {
    return normalizeOptionalText(notes)
        ? buildSectionCard("Notes", escapeMultilineHtml(notes))
        : "";
}

function buildTermsSection(
    terms: string | undefined,
    fallbackTerms: string | undefined
) {
    const resolvedTerms = normalizeOptionalText(terms) || normalizeOptionalText(fallbackTerms);

    if (!resolvedTerms) {
        return "";
    }

    return buildSectionCard("Terms & Conditions", escapeMultilineHtml(resolvedTerms));
}

function buildBankDetailsSection(details: PdfTemplateBrandDetails) {
    const lines = [
        normalizeOptionalText(details.bankAccountName)
            ? `Account Name: ${normalizeOptionalText(details.bankAccountName)}`
            : "",
        normalizeOptionalText(details.bankSortCode)
            ? `Sort Code: ${normalizeOptionalText(details.bankSortCode)}`
            : "",
        normalizeOptionalText(details.bankAccountNumber)
            ? `Account Number: ${normalizeOptionalText(details.bankAccountNumber)}`
            : "",
    ]
        .filter(Boolean)
        .join("\n");

    return lines ? buildSectionCard("Bank Transfer Details", escapeMultilineHtml(lines)) : "";
}

function applyTemplateValues(template: string, values: TemplateValues) {
    return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_match, token) => {
        const key = String(token).toLowerCase();
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : "";
    });
}

function ensureHtmlDocument(html: string) {
    const trimmed = html.trim();

    if (!trimmed) {
        return "";
    }

    if (/<html[\s>]/i.test(trimmed)) {
        return trimmed;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>${trimmed}</body>
</html>`;
}

function stripCssComments(value: string) {
    return value.replace(/\/\*[\s\S]*?\*\//g, "");
}

function hasBalancedCssValueDelimiters(value: string) {
    let parentheses = 0;
    let brackets = 0;
    let quote: "'" | '"' | null = null;

    for (let index = 0; index < value.length; index += 1) {
        const character = value[index];
        const previous = index > 0 ? value[index - 1] : "";

        if (quote) {
            if (character === quote && previous !== "\\") {
                quote = null;
            }
            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            continue;
        }

        if (character === "(") {
            parentheses += 1;
            continue;
        }

        if (character === ")") {
            parentheses -= 1;
            if (parentheses < 0) {
                return false;
            }
            continue;
        }

        if (character === "[") {
            brackets += 1;
            continue;
        }

        if (character === "]") {
            brackets -= 1;
            if (brackets < 0) {
                return false;
            }
        }
    }

    return parentheses === 0 && brackets === 0 && quote === null;
}

function splitCssDeclarations(block: string) {
    const declarations: string[] = [];
    let current = "";
    let parentheses = 0;
    let brackets = 0;
    let quote: "'" | '"' | null = null;

    for (let index = 0; index < block.length; index += 1) {
        const character = block[index];
        const previous = index > 0 ? block[index - 1] : "";

        current += character;

        if (quote) {
            if (character === quote && previous !== "\\") {
                quote = null;
            }
            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            continue;
        }

        if (character === "(") {
            parentheses += 1;
            continue;
        }

        if (character === ")") {
            parentheses = Math.max(0, parentheses - 1);
            continue;
        }

        if (character === "[") {
            brackets += 1;
            continue;
        }

        if (character === "]") {
            brackets = Math.max(0, brackets - 1);
            continue;
        }

        if (character === ";" && parentheses === 0 && brackets === 0) {
            declarations.push(current.slice(0, -1));
            current = "";
        }
    }

    if (current.trim()) {
        declarations.push(current);
    }

    return declarations;
}

function findFirstCssColon(declaration: string) {
    let parentheses = 0;
    let brackets = 0;
    let quote: "'" | '"' | null = null;

    for (let index = 0; index < declaration.length; index += 1) {
        const character = declaration[index];
        const previous = index > 0 ? declaration[index - 1] : "";

        if (quote) {
            if (character === quote && previous !== "\\") {
                quote = null;
            }
            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            continue;
        }

        if (character === "(") {
            parentheses += 1;
            continue;
        }

        if (character === ")") {
            parentheses = Math.max(0, parentheses - 1);
            continue;
        }

        if (character === "[") {
            brackets += 1;
            continue;
        }

        if (character === "]") {
            brackets = Math.max(0, brackets - 1);
            continue;
        }

        if (character === ":" && parentheses === 0 && brackets === 0) {
            return index;
        }
    }

    return -1;
}

function sanitizeCssDeclarationBlock(block: string) {
    return splitCssDeclarations(stripCssComments(block))
        .map((declaration) => declaration.trim())
        .filter(Boolean)
        .map((declaration) => {
            const colonIndex = findFirstCssColon(declaration);

            if (colonIndex <= 0) {
                return "";
            }

            const property = declaration.slice(0, colonIndex).trim().toLowerCase();
            const value = declaration.slice(colonIndex + 1).trim();

            if (!/^-?[a-z][a-z0-9-]*$/i.test(property)) {
                return "";
            }

            if (!value || !hasBalancedCssValueDelimiters(value)) {
                return "";
            }

            if (
                /\b(?:lab|lch|oklab|oklch|color|var|env|expression)\(/i.test(value) ||
                /javascript:/i.test(value) ||
                /@import/i.test(value)
            ) {
                return "";
            }

            return `${property}: ${value}`;
        })
        .filter(Boolean)
        .join("; ");
}

function sanitizeCssText(cssText: string) {
    const cleanCss = stripCssComments(cssText);
    let output = "";
    let selector = "";
    let block = "";
    let depth = 0;
    let quote: "'" | '"' | null = null;

    for (let index = 0; index < cleanCss.length; index += 1) {
        const character = cleanCss[index];
        const previous = index > 0 ? cleanCss[index - 1] : "";

        if (quote) {
            if (character === quote && previous !== "\\") {
                quote = null;
            }

            if (depth > 0) {
                block += character;
            } else {
                selector += character;
            }
            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;

            if (depth > 0) {
                block += character;
            } else {
                selector += character;
            }
            continue;
        }

        if (character === "{") {
            if (depth === 0) {
                depth = 1;
                continue;
            }

            depth += 1;
            block += character;
            continue;
        }

        if (character === "}") {
            if (depth === 1) {
                const cleanSelector = selector.trim();
                const cleanBlock = sanitizeCssDeclarationBlock(block);

                if (cleanSelector && cleanBlock && !cleanSelector.startsWith("@")) {
                    output += `${cleanSelector} { ${cleanBlock}; }\n`;
                }

                selector = "";
                block = "";
                depth = 0;
                continue;
            }

            if (depth > 1) {
                depth -= 1;
                block += character;
            }
            continue;
        }

        if (depth > 0) {
            block += character;
        } else {
            selector += character;
        }
    }

    return output.trim();
}

function sanitizeInlineStylesInHtml(html: string) {
    return html.replace(
        /\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi,
        (_match, _full, doubleQuotedValue, singleQuotedValue) => {
            const value =
                typeof doubleQuotedValue === "string"
                    ? doubleQuotedValue
                    : singleQuotedValue || "";
            const sanitized = sanitizeCssDeclarationBlock(value);

            return sanitized ? ` style="${escapeHtml(sanitized)}"` : "";
        }
    );
}

function sanitizePdfTemplateHtml(html: string) {
    const withSafeStyleBlocks = html.replace(
        /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
        (_match, cssText) => {
            const sanitizedCss = sanitizeCssText(cssText || "");
            return sanitizedCss ? `<style>${sanitizedCss}</style>` : "";
        }
    );

    return sanitizeInlineStylesInHtml(withSafeStyleBlocks);
}

function buildCommonValues(
    document: PdfTemplateQuote | PdfTemplateInvoice,
    details: PdfTemplateBrandDetails,
    documentTitle: string,
    documentNumber: string
): TemplateValues {
    const palette = getPalette(details);
    const businessName = buildBusinessName(details);
    const businessAddress = buildBusinessAddress(details);

    return {
        document_title: escapeHtml(documentTitle),
        document_number: escapeHtml(documentNumber),
        quote_number: "quoteNumber" in document ? escapeHtml(document.quoteNumber) : "",
        invoice_number: "invoiceNumber" in document ? escapeHtml(document.invoiceNumber) : "",
        document_date: escapeHtml(formatDate(document.date)),
        status: escapeHtml(document.status),
        customer_name: escapeHtml(document.customerName),
        customer_type: escapeHtml(document.customerType || "Residential"),
        customer_address: escapeHtml(buildCustomerAddress(document)),
        customer_location: escapeHtml(buildCustomerLocation(document)),
        site_name: escapeHtml(normalizeOptionalText(document.siteName)),
        site_address: escapeHtml(normalizeOptionalText(document.siteAddress)),
        site_location: escapeHtml(buildSiteLocation(document)),
        business_name: escapeHtml(businessName),
        business_address: escapeMultilineHtml(businessAddress),
        business_email: escapeHtml(normalizeOptionalText(details.businessEmail)),
        business_phone: escapeHtml(normalizeOptionalText(details.businessPhone)),
        business_website: escapeHtml(normalizeOptionalText(details.website)),
        website: escapeHtml(normalizeOptionalText(details.website)),
        terms_url: escapeHtml(normalizeOptionalText(details.termsAndConditionsUrl)),
        logo_url: escapeHtml(normalizeOptionalText(details.logoUrl)),
        logo_markup: buildLogoMarkup(details),
        primary_color: palette.primary,
        secondary_color: palette.secondary,
        primary_text_color: palette.primaryText,
        secondary_text_color: palette.secondaryText,
        ink_color: palette.ink,
        muted_color: palette.muted,
        border_color: palette.border,
        surface_color: palette.surface,
        items_rows: buildItemsRows(document.items),
        total: escapeHtml(formatMoney(Number(document.total || 0))),
        business_details_section: buildBusinessDetailsSection(details),
        service_location_section: buildServiceLocationSection(document),
        notes_section: buildNotesSection(document.notes),
        notes: escapeHtml(normalizeOptionalText(document.notes)),
        notes_html: escapeMultilineHtml(document.notes),
    };
}

export function renderQuotePdfTemplate(
    templateHtml: string,
    quote: PdfTemplateQuote,
    details: PdfTemplateBrandDetails = {}
) {
    const values: TemplateValues = {
        ...buildCommonValues(quote, details, "Quote", quote.quoteNumber),
        due_date: "",
        subtotal: escapeHtml(formatMoney(getSubtotal(quote.items))),
        vat_rate: escapeHtml("0"),
        vat_amount: escapeHtml(formatMoney(0)),
        summary_rows: buildSummaryRows([
            { label: "Total", value: formatMoney(Number(quote.total || 0)), total: true },
        ]),
        terms: escapeHtml(
            normalizeOptionalText(details.defaultQuoteTerms) ||
                normalizeOptionalText(details.termsAndConditionsUrl)
        ),
        terms_html: escapeMultilineHtml(
            details.defaultQuoteTerms || details.termsAndConditionsUrl
        ),
        terms_section: buildTermsSection(
            details.defaultQuoteTerms,
            details.termsAndConditionsUrl
        ),
        bank_account_name: "",
        bank_sort_code: "",
        bank_account_number: "",
        payment_reference: "",
        bank_details_section: "",
    };

    return sanitizePdfTemplateHtml(
        ensureHtmlDocument(applyTemplateValues(templateHtml, values))
    );
}

export function renderInvoicePdfTemplate(
    templateHtml: string,
    invoice: PdfTemplateInvoice,
    details: PdfTemplateBrandDetails = {}
) {
    const subtotal = getSubtotal(invoice.items);
    const vatAmount = Number(invoice.vatAmount ?? 0);

    const values: TemplateValues = {
        ...buildCommonValues(invoice, details, "Invoice", invoice.invoiceNumber),
        due_date: escapeHtml(formatDate(invoice.dueDate)),
        subtotal: escapeHtml(formatMoney(subtotal)),
        vat_rate: escapeHtml(String(Number(invoice.vatRate ?? 0))),
        vat_amount: escapeHtml(formatMoney(vatAmount)),
        summary_rows: buildSummaryRows([
            { label: "Subtotal", value: formatMoney(subtotal) },
            ...(vatAmount > 0
                ? [{ label: `VAT (${Number(invoice.vatRate ?? 0)}%)`, value: formatMoney(vatAmount) }]
                : []),
            { label: "Total Due", value: formatMoney(Number(invoice.total || 0)), total: true },
        ]),
        terms: escapeHtml(
            normalizeOptionalText(invoice.terms) ||
                normalizeOptionalText(details.defaultInvoiceTerms) ||
                normalizeOptionalText(details.termsAndConditionsUrl)
        ),
        terms_html: escapeMultilineHtml(
            invoice.terms || details.defaultInvoiceTerms || details.termsAndConditionsUrl
        ),
        terms_section: buildTermsSection(
            invoice.terms || details.defaultInvoiceTerms,
            details.termsAndConditionsUrl
        ),
        bank_account_name: escapeHtml(normalizeOptionalText(details.bankAccountName)),
        bank_sort_code: escapeHtml(normalizeOptionalText(details.bankSortCode)),
        bank_account_number: escapeHtml(normalizeOptionalText(details.bankAccountNumber)),
        payment_reference: escapeHtml(
            normalizeOptionalText(details.bankPaymentReference) || invoice.invoiceNumber
        ),
        bank_details_section: buildBankDetailsSection(details),
    };

    return sanitizePdfTemplateHtml(
        ensureHtmlDocument(applyTemplateValues(templateHtml, values))
    );
}
