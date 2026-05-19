import jsPDF from "jspdf";
import type {
    InvoiceStatus,
    QuoteStatus,
    StripeInvoicePaymentStatus,
} from "./types";

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

type Quote = DocumentCustomerFields & {
    id: string;
    quoteNumber: string;
    customerId: number | null;
    customerName: string;
    date: string;
    status: QuoteStatus;
    items: LineItem[];
    notes?: string;
    total: number;
};

type Invoice = DocumentCustomerFields & {
    id: string;
    invoiceNumber: string;
    customerId: number | null;
    customerName: string;
    date: string;
    dueDate?: string;
    status: InvoiceStatus;
    items: LineItem[];
    notes?: string;
    terms?: string;
    vatRate?: number;
    vatAmount?: number;
    total: number;
    linkedQuoteId?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentLinkUrl?: string;
    stripePaymentStatus?: StripeInvoicePaymentStatus;
    stripePaymentIntentId?: string;
    stripePaymentCompletedAt?: string;
};

export type DocumentBrandDetails = {
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
    pdfHeaderStyle?: "banner" | "letterhead";
    pdfLogoBackground?: "none" | "dark" | "light";
    pdfLogoScale?: number;
    pdfShowLogo?: boolean;
    pdfShowFooter?: boolean;
    pdfShowBusinessDetails?: boolean;
    pdfFooterText?: string;
};

type BrandPalette = {
    primary: string;
    secondary: string;
    primaryText: string;
    secondaryText: string;
    ink: string;
    muted: string;
    border: string;
    surface: string;
    white: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
};

type LogoAsset = {
    dataUrl: string;
    width: number;
    height: number;
    format: "PNG" | "JPEG";
};

type DocumentPdfSettings = {
    headerStyle: "banner" | "letterhead";
    logoBackground: "none" | "dark" | "light";
    logoScale: number;
    showLogo: boolean;
    showFooter: boolean;
    showBusinessDetails: boolean;
    footerText: string;
};

type SummaryRow = {
    label: string;
    value: string;
    emphasized?: boolean;
};

type DetailRow = {
    label: string;
    value: string;
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_BOTTOM = PAGE_HEIGHT - 24;
const FOOTER_Y = PAGE_HEIGHT - 12;
const GBP_SYMBOL = String.fromCharCode(163);
const STRIPE_SECURE_PAYMENT_LOGO_URL = "/stripe-secure-payment-logo-cropped.png";

function formatMoney(value: number) {
    return `${GBP_SYMBOL}${value.toFixed(2)}`;
}

function formatDate(value: string | undefined) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function normalizeOptionalText(value: string | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function buildLocationLine(town?: string, postcode?: string) {
    return [town, postcode].filter(Boolean).join(", ");
}

function buildCustomerLines(
    document: Quote | Invoice,
    includeName: boolean
) {
    const location = buildLocationLine(
        normalizeOptionalText(document.customerTown),
        normalizeOptionalText(document.customerPostcode)
    );

    return [
        includeName ? document.customerName : undefined,
        normalizeOptionalText(document.customerAddress),
        location || undefined,
    ].filter(Boolean) as string[];
}

function buildSiteLines(document: Quote | Invoice) {
    if (document.customerType !== "Commercial") {
        return [];
    }

    const location = buildLocationLine(
        normalizeOptionalText(document.siteTown),
        normalizeOptionalText(document.sitePostcode)
    );

    return [
        normalizeOptionalText(document.siteName),
        normalizeOptionalText(document.siteAddress),
        location || undefined,
    ].filter(Boolean) as string[];
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

function setFillColor(doc: jsPDF, hex: string) {
    const { r, g, b } = hexToRgb(hex);
    doc.setFillColor(r, g, b);
}

function setDrawColor(doc: jsPDF, hex: string) {
    const { r, g, b } = hexToRgb(hex);
    doc.setDrawColor(r, g, b);
}

function setTextColor(doc: jsPDF, hex: string) {
    const { r, g, b } = hexToRgb(hex);
    doc.setTextColor(r, g, b);
}

function getContrastingTextColor(hex: string) {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? "#0f172a" : "#ffffff";
}

function getBrandPalette(details: DocumentBrandDetails): BrandPalette {
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
        white: "#ffffff",
        success: "#12805c",
        warning: "#b76b12",
        danger: "#bf3c3c",
        info: "#275ea6",
    };
}

function getDocumentPdfSettings(details: DocumentBrandDetails): DocumentPdfSettings {
    const rawLogoScale =
        typeof details.pdfLogoScale === "number"
            ? details.pdfLogoScale
            : Number(details.pdfLogoScale);
    const logoScale = Number.isFinite(rawLogoScale)
        ? Math.min(160, Math.max(60, rawLogoScale)) / 100
        : 1;

    return {
        headerStyle: details.pdfHeaderStyle === "letterhead" ? "letterhead" : "banner",
        logoBackground:
            details.pdfLogoBackground === "dark" || details.pdfLogoBackground === "light"
                ? details.pdfLogoBackground
                : "none",
        logoScale,
        showLogo: details.pdfShowLogo !== false,
        showFooter: details.pdfShowFooter !== false,
        showBusinessDetails: details.pdfShowBusinessDetails !== false,
        footerText: normalizeOptionalText(details.pdfFooterText) ?? "",
    };
}

function getCompanyName(details: DocumentBrandDetails) {
    return (
        normalizeOptionalText(details.tradingName) ||
        normalizeOptionalText(details.businessName) ||
        "Your Business"
    );
}

function buildBusinessAddressLine(details: DocumentBrandDetails) {
    return [
        normalizeOptionalText(details.addressLine1),
        normalizeOptionalText(details.addressLine2),
        normalizeOptionalText(details.townCity),
        normalizeOptionalText(details.county),
        normalizeOptionalText(details.postcode),
    ]
        .filter(Boolean)
        .join(", ");
}

function buildBusinessContactLine(details: DocumentBrandDetails) {
    return [
        normalizeOptionalText(details.businessPhone),
        normalizeOptionalText(details.businessEmail),
        normalizeOptionalText(details.website),
    ]
        .filter(Boolean)
        .join(" | ");
}

function buildBusinessInfoLines(details: DocumentBrandDetails) {
    return [buildBusinessAddressLine(details), buildBusinessContactLine(details)].filter(
        Boolean
    ) as string[];
}

function buildBusinessCardLines(details: DocumentBrandDetails) {
    return [getCompanyName(details), ...buildBusinessInfoLines(details)];
}

function resolveLogoUrl(logoUrl?: string) {
    const candidate = logoUrl?.trim();

    if (!candidate) {
        return undefined;
    }

    if (/^(https?:|data:)/i.test(candidate)) {
        return candidate;
    }

    if (typeof window === "undefined") {
        return candidate;
    }

    return new URL(candidate, window.location.origin).toString();
}

function isVisibleLogoPixel(
    alpha: number
) {
    return alpha >= 20;
}

function shouldPreserveLogoArtwork(logoUrl?: string) {
    const candidate = resolveLogoUrl(logoUrl)?.toLowerCase();

    if (!candidate) {
        return false;
    }

    return /\.jpe?g(?:$|[?#])/i.test(candidate);
}

async function loadLogoAsset(logoUrl?: string): Promise<LogoAsset | null> {
    if (typeof window === "undefined") {
        return null;
    }

    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        const resolvedLogoUrl = resolveLogoUrl(logoUrl);
        const preserveArtwork = shouldPreserveLogoArtwork(logoUrl);

        if (!resolvedLogoUrl) {
            resolve(null);
            return;
        }

        image.onload = () => {
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            if (!context) {
                resolve(null);
                return;
            }

            const width = image.naturalWidth || image.width;
            const height = image.naturalHeight || image.height;

            canvas.width = width;
            canvas.height = height;
            context.drawImage(image, 0, 0, width, height);

            if (preserveArtwork) {
                resolve({
                    dataUrl: canvas.toDataURL("image/jpeg", 0.98),
                    width,
                    height,
                    format: "JPEG",
                });
                return;
            }

            const pixels = context.getImageData(0, 0, width, height).data;
            let minX = width;
            let minY = height;
            let maxX = -1;
            let maxY = -1;

            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    const index = (y * width + x) * 4;
                    const alpha = pixels[index + 3];

                    if (!isVisibleLogoPixel(alpha)) {
                        continue;
                    }

                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }

            if (maxX < 0 || maxY < 0) {
                resolve(null);
                return;
            }

            const padding = 24;
            const cropX = Math.max(0, minX - padding);
            const cropY = Math.max(0, minY - padding);
            const cropWidth = Math.min(width - cropX, maxX - minX + padding * 2 + 1);
            const cropHeight = Math.min(height - cropY, maxY - minY + padding * 2 + 1);

            const croppedCanvas = document.createElement("canvas");
            const croppedContext = croppedCanvas.getContext("2d");

            if (!croppedContext) {
                resolve(null);
                return;
            }

            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;
            croppedContext.drawImage(
                canvas,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                cropWidth,
                cropHeight
            );

            const croppedImageData = croppedContext.getImageData(0, 0, cropWidth, cropHeight);
            const croppedPixels = croppedImageData.data;
            const hasTransparentPixels = Array.from(
                { length: croppedPixels.length / 4 },
                (_, pixelIndex) => croppedPixels[pixelIndex * 4 + 3]
            ).some((alpha) => alpha < 245);
            const shouldRemoveWhiteBackground = !hasTransparentPixels;
            let remainingVisiblePixels = 0;

            for (let index = 0; index < croppedPixels.length; index += 4) {
                const red = croppedPixels[index];
                const green = croppedPixels[index + 1];
                const blue = croppedPixels[index + 2];
                const alpha = croppedPixels[index + 3];

                if (
                    alpha < 20 ||
                    (shouldRemoveWhiteBackground &&
                        red > 245 &&
                        green > 245 &&
                        blue > 245)
                ) {
                    croppedPixels[index + 3] = 0;
                } else {
                    remainingVisiblePixels += 1;
                }
            }

            if (remainingVisiblePixels > 0) {
                croppedContext.putImageData(croppedImageData, 0, 0);
            }

            resolve({
                dataUrl: croppedCanvas.toDataURL("image/png"),
                width: cropWidth,
                height: cropHeight,
                format: "PNG",
            });
        };

        image.onerror = () => resolve(null);
        image.src = resolvedLogoUrl;
    });
}

function drawCardShell(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    palette: BrandPalette,
    accentColor: string | null = palette.primary
) {
    setFillColor(doc, palette.white);
    setDrawColor(doc, palette.border);
    doc.roundedRect(x, y, width, height, 4, 4, "FD");
    if (accentColor) {
        setFillColor(doc, accentColor);
        doc.roundedRect(x, y, width, 1.8, 4, 4, "F");
    }
}

function ensurePageSpace(doc: jsPDF, startY: number, requiredHeight: number) {
    if (startY + requiredHeight <= BODY_BOTTOM) {
        return startY;
    }

    doc.addPage();
    return MARGIN;
}

function fitInside(
    maxWidth: number,
    maxHeight: number,
    width: number,
    height: number
) {
    const scale = Math.min(maxWidth / width, maxHeight / height);

    return {
        width: width * scale,
        height: height * scale,
    };
}

function drawLogoAsset(
    doc: jsPDF,
    options: {
        logoAsset: LogoAsset;
        x: number;
        y: number;
        maxWidth: number;
        maxHeight: number;
        palette: BrandPalette;
        background: DocumentPdfSettings["logoBackground"];
    }
) {
    const { logoAsset, x, y, maxWidth, maxHeight, palette, background } = options;
    const padding = background === "none" ? 0 : 3;
    const dimensions = fitInside(
        Math.max(4, maxWidth - padding * 2),
        Math.max(4, maxHeight - padding * 2),
        logoAsset.width,
        logoAsset.height
    );
    const imageX = x + padding;
    const imageY = y + (maxHeight - dimensions.height) / 2;

    if (background !== "none") {
        setFillColor(doc, background === "dark" ? palette.secondary : palette.white);
        setDrawColor(doc, background === "dark" ? palette.secondary : palette.border);
        doc.roundedRect(x, y, dimensions.width + padding * 2, maxHeight, 2, 2, "FD");
    }

    doc.addImage(
        logoAsset.dataUrl,
        logoAsset.format,
        imageX,
        imageY,
        dimensions.width,
        dimensions.height
    );
}

function drawDocumentHeader(
    doc: jsPDF,
    options: {
        title: string;
        documentNumber: string;
        palette: BrandPalette;
        logoAsset: LogoAsset | null;
        brandName: string;
        logoBackground: DocumentPdfSettings["logoBackground"];
        logoScale: number;
        subtitleLines?: string[];
        boxedTitle?: boolean;
        showDocumentNumber?: boolean;
        titleColor?: string;
    }
) {
    const {
        title,
        documentNumber,
        palette,
        logoAsset,
        brandName,
        logoBackground,
        logoScale,
        subtitleLines = [],
        boxedTitle = true,
        showDocumentNumber = true,
        titleColor,
    } = options;
    const titleBoxWidth = 82;
    const titleBoxHeight = 30;
    const titleBoxX = PAGE_WIDTH - MARGIN - titleBoxWidth;
    const titleBoxY = 10;
    const leftColumnWidth = titleBoxX - MARGIN - 10;
    let metaStartY = 30;

    if (logoAsset) {
        const imageY = 10;
        const maxLogoHeight = Math.min(32, 22 * logoScale);
        const maxLogoWidth = Math.min(leftColumnWidth, leftColumnWidth * logoScale);
        const dimensions = fitInside(
            maxLogoWidth,
            maxLogoHeight,
            logoAsset.width,
            logoAsset.height
        );
        drawLogoAsset(doc, {
            logoAsset,
            x: MARGIN,
            y: imageY,
            maxWidth: maxLogoWidth,
            maxHeight: maxLogoHeight,
            palette,
            background: logoBackground,
        });
        metaStartY = imageY + dimensions.height + 4;
    } else {
        setTextColor(doc, palette.secondary);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(brandName.toUpperCase(), MARGIN, 18, {
            maxWidth: leftColumnWidth,
        });
        metaStartY = 23;
    }

    if (subtitleLines.length > 0) {
        const wrappedMeta = subtitleLines.flatMap((line) =>
            doc.splitTextToSize(line, leftColumnWidth)
        );

        setTextColor(doc, palette.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(wrappedMeta, MARGIN, metaStartY);
    }

    if (boxedTitle) {
        setFillColor(doc, palette.secondary);
        doc.roundedRect(titleBoxX, titleBoxY, titleBoxWidth, titleBoxHeight, 2.5, 2.5, "F");
        setFillColor(doc, palette.primary);
        doc.rect(titleBoxX, titleBoxY, titleBoxWidth, 2.5, "F");

        setTextColor(doc, palette.secondaryText);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.text(title.toUpperCase(), titleBoxX + 5, titleBoxY + 13.2);

        if (showDocumentNumber) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text(documentNumber, titleBoxX + 5, titleBoxY + 21);
        }
    } else {
        const bannerHeight = 30;
        const bannerY = 10;
        const bannerPadding = 6;

        setFillColor(doc, palette.secondary);
        doc.roundedRect(MARGIN, bannerY, CONTENT_WIDTH, bannerHeight, 3, 3, "F");

        if (logoAsset) {
            const maxLogoHeight = Math.min(28, 19 * logoScale);
            const maxLogoWidth = Math.min(130, 116 * logoScale);
            drawLogoAsset(doc, {
                logoAsset,
                x: MARGIN + bannerPadding,
                y: bannerY + (bannerHeight - maxLogoHeight) / 2,
                maxWidth: maxLogoWidth,
                maxHeight: maxLogoHeight,
                palette,
                background: logoBackground,
            });
        } else {
            setTextColor(doc, "#ffffff");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.text(brandName.toUpperCase(), MARGIN + bannerPadding, bannerY + 18.5, {
                maxWidth: 116,
            });
        }

        setTextColor(doc, titleColor || "#ffffff");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.text(title.toUpperCase(), PAGE_WIDTH - MARGIN - bannerPadding, bannerY + 19.5, {
            align: "right",
        });
    }

    setDrawColor(doc, palette.border);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, 48, PAGE_WIDTH - MARGIN, 48);

    return 56;
}

function drawRecipientPanel(
    doc: jsPDF,
    options: {
        x: number;
        y: number;
        width: number;
        label: string;
        lines: string[];
        palette: BrandPalette;
        showLabel?: boolean;
        plain?: boolean;
    }
) {
    const { x, y, width, label, lines, palette, showLabel = true, plain = false } = options;
    const safeLines = lines.length > 0 ? lines : ["-"];
    const wrappedLines = safeLines.flatMap((line) => doc.splitTextToSize(line, width - 12));
    const topPadding = showLabel ? 15 : 8;
    const height = topPadding + wrappedLines.length * 4.8 + 7;

    if (plain) {
        setFillColor(doc, palette.white);
        setDrawColor(doc, palette.border);
        doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
    } else {
        setFillColor(doc, palette.ink);
        doc.roundedRect(x, y, width, height, 2.5, 2.5, "F");
        setFillColor(doc, palette.primary);
        doc.rect(x, y, width, 2.8, "F");
    }

    if (showLabel) {
        setTextColor(doc, plain ? palette.muted : palette.primary);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(label.toUpperCase(), x + 5, y + 8.5);
    }

    setTextColor(doc, plain ? palette.ink : "#ffffff");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(wrappedLines, x + 5, y + (showLabel ? 15 : 10.5));

    return height;
}

function drawInfoBox(
    doc: jsPDF,
    options: {
        x: number;
        y: number;
        width: number;
        label: string;
        value: string;
        palette: BrandPalette;
        showAccent?: boolean;
    }
) {
    const { x, y, width, label, value, palette, showAccent = true } = options;
    const wrappedValue = doc.splitTextToSize(value || "-", width - 8);
    const height = Math.max(13, 7 + wrappedValue.length * 4.4 + 4);

    setFillColor(doc, palette.surface);
    setDrawColor(doc, palette.border);
    doc.roundedRect(x, y, width, height, 1.8, 1.8, "FD");
    if (showAccent) {
        setFillColor(doc, palette.primary);
        doc.roundedRect(x, y, width, 1.4, 1.4, 1.4, "F");
    }

    setTextColor(doc, palette.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), x + 4, y + 5);

    setTextColor(doc, palette.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.2);
    doc.text(wrappedValue, x + 4, y + 10.2);

    return height;
}

function drawTextCard(
    doc: jsPDF,
    options: {
        x: number;
        y: number;
        width: number;
        title: string;
        lines: string[];
        palette: BrandPalette;
        accentColor?: string | null;
    }
) {
    const { x, y, width, title, lines, palette, accentColor } = options;
    const safeLines = lines.length > 0 ? lines : ["-"];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const wrappedLines = safeLines.flatMap((line) =>
        doc.splitTextToSize(line || "-", width - 10)
    );
    const height = 15 + wrappedLines.length * 4.7 + 8;

    drawCardShell(doc, x, y, width, height, palette, accentColor);
    setTextColor(doc, palette.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(title.toUpperCase(), x + 5, y + 9.5);

    setTextColor(doc, palette.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(wrappedLines, x + 5, y + 16);

    return height;
}

function drawDetailCard(
    doc: jsPDF,
    options: {
        x: number;
        y: number;
        width: number;
        title: string;
        rows: DetailRow[];
        palette: BrandPalette;
        accentColor?: string | null;
    }
) {
    const { x, y, width, title, rows, palette, accentColor } = options;
    const safeRows = rows.length > 0 ? rows : [{ label: "Details", value: "-" }];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const valueLineHeight = 4.6;
    const labelBlockHeight = 4.8;
    const rowGap = 4;
    const rowValues = safeRows.map((row) => {
        const wrapped = doc.splitTextToSize(row.value || "-", width - 16);
        return wrapped.length > 0 ? wrapped : ["-"];
    });
    const rowHeights = rowValues.map((wrapped) =>
        Math.max(5.5, wrapped.length * valueLineHeight)
    );

    const height =
        18 +
        rowHeights.reduce(
            (sum, rowHeight) => sum + labelBlockHeight + rowHeight + rowGap,
            0
        ) +
        3;

    drawCardShell(doc, x, y, width, height, palette, accentColor);
    setTextColor(doc, palette.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(title.toUpperCase(), x + 5, y + 9.5);

    let currentY = y + 17.5;
    safeRows.forEach((row, index) => {
        const wrapped = rowValues[index];

        setTextColor(doc, palette.muted);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(row.label.toUpperCase(), x + 5, currentY);

        currentY += labelBlockHeight;

        setTextColor(doc, palette.ink);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(wrapped, x + 5, currentY);

        currentY += rowHeights[index] + rowGap;
    });

    return height;
}

function drawPaymentBadgeCard(
    doc: jsPDF,
    options: {
        x: number;
        y: number;
        width: number;
        paymentBadgeAsset: LogoAsset | null;
        palette: BrandPalette;
    }
) {
    const { x, y, width, paymentBadgeAsset, palette } = options;
    const copy = "Secure card payments available through Stripe.";
    const wrappedCopy = doc.splitTextToSize(copy, width - 10);
    const badgeMaxWidth = width - 10;
    const badgeMaxHeight = 16;
    const badgeDimensions = paymentBadgeAsset
        ? fitInside(
              badgeMaxWidth,
              badgeMaxHeight,
              paymentBadgeAsset.width,
              paymentBadgeAsset.height
          )
        : null;
    const imageHeight = badgeDimensions ? badgeDimensions.height + 5 : 0;
    const height = 17 + imageHeight + wrappedCopy.length * 4.6 + 8;

    drawCardShell(doc, x, y, width, height, palette, palette.primary);
    setTextColor(doc, palette.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("PAY ONLINE", x + 5, y + 9.5);

    let currentY = y + 16.5;

    if (paymentBadgeAsset && badgeDimensions) {
        doc.addImage(
            paymentBadgeAsset.dataUrl,
            paymentBadgeAsset.format,
            x + 5,
            currentY,
            badgeDimensions.width,
            badgeDimensions.height
        );
        currentY += badgeDimensions.height + 5;
    }

    setTextColor(doc, palette.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(wrappedCopy, x + 5, currentY);

    return height;
}

function drawItemsTable(
    doc: jsPDF,
    items: LineItem[],
    startY: number,
    palette: BrandPalette,
    title: string,
    options?: {
        showRate?: boolean;
    }
) {
    const showRate = options?.showRate ?? true;
    const leftInsetX = MARGIN + 4;
    const rightInsetX = PAGE_WIDTH - MARGIN - 4;
    const qtyX = showRate ? 125 : 154;
    const rateX = 148;
    let y = ensurePageSpace(doc, startY, title ? 18 : 12);

    if (title) {
        setTextColor(doc, palette.ink);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(title, MARGIN, y);
        y += 7;
    }

    const drawHeaderRow = () => {
        setFillColor(doc, palette.secondary);
        doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 8.5, 1.8, 1.8, "F");

        setTextColor(doc, palette.secondaryText);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("Description", leftInsetX, y + 5.4);
        if (showRate) {
            doc.text("Qty", qtyX, y + 5.4);
            doc.text("Rate", rateX, y + 5.4);
            doc.text("Total", rightInsetX, y + 5.4, { align: "right" });
        } else {
            doc.text("Qty", qtyX, y + 5.4);
            doc.text("Amount", rightInsetX, y + 5.4, { align: "right" });
        }
        y += 10.5;
    };

    drawHeaderRow();

    const safeItems =
        items.length > 0
            ? items
            : [{ id: "empty", description: "No line items added.", quantity: 0, price: 0 }];

    safeItems.forEach((item, index) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        const descriptionLines = doc.splitTextToSize(
            item.description || "-",
            showRate ? qtyX - leftInsetX - 10 : qtyX - leftInsetX - 10
        );
        const rowHeight = Math.max(12, descriptionLines.length * 4.8 + 6);

        if (y + rowHeight > BODY_BOTTOM) {
            doc.addPage();
            y = MARGIN;
            drawHeaderRow();
        }

        setTextColor(doc, palette.ink);
        doc.text(descriptionLines, leftInsetX, y + 4.8);
        if (showRate) {
            doc.text(String(item.quantity || 0), qtyX, y + 4.8);
            doc.text(formatMoney(Number(item.price || 0)), rateX, y + 4.8);
            doc.text(
                formatMoney(Number(item.quantity || 0) * Number(item.price || 0)),
                rightInsetX,
                y + 4.8,
                { align: "right" }
            );
        } else {
            doc.text(String(item.quantity || 0), qtyX, y + 4.8);
            doc.text(
                formatMoney(Number(item.quantity || 0) * Number(item.price || 0)),
                rightInsetX,
                y + 4.8,
                { align: "right" }
            );
        }

        setDrawColor(doc, palette.border);
        doc.line(MARGIN, y + rowHeight - 1.3, PAGE_WIDTH - MARGIN, y + rowHeight - 1.3);
        y += rowHeight + 1.5;
    });

    return y + 6;
}

function drawSimpleTotalBox(
    doc: jsPDF,
    options: {
        x: number;
        y: number;
        width: number;
        label: string;
        value: string;
        palette: BrandPalette;
    }
) {
    const { x, y, width, label, value, palette } = options;
    const height = 16;

    setFillColor(doc, palette.secondary);
    doc.roundedRect(x, y, width, height, 2.5, 2.5, "F");

    setTextColor(doc, palette.secondaryText);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, x + 5, y + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(value, x + width - 5, y + 10, { align: "right" });

    return height;
}

function drawSummaryCard(
    doc: jsPDF,
    options: {
        x: number;
        y: number;
        width: number;
        title: string;
        rows: SummaryRow[];
        palette: BrandPalette;
        accentColor?: string | null;
        emphasizedBackground?: string | null;
    }
) {
    const {
        x,
        y,
        width,
        title,
        rows,
        palette,
        accentColor = null,
        emphasizedBackground = null,
    } = options;
    const height = 15 + rows.length * 8.5 + 6;

    drawCardShell(doc, x, y, width, height, palette, accentColor);
    setTextColor(doc, palette.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(title.toUpperCase(), x + 5, y + 9.5);

    let currentY = y + 17;

    rows.forEach((row, index) => {
        if (row.emphasized && emphasizedBackground) {
            setFillColor(doc, emphasizedBackground);
            doc.roundedRect(x + 3, currentY - 5.5, width - 6, 7.8, 2, 2, "F");
        }

        setTextColor(
            doc,
            row.emphasized && emphasizedBackground
                ? getContrastingTextColor(emphasizedBackground)
                : row.emphasized
                  ? palette.secondary
                  : palette.muted
        );
        doc.setFont("helvetica", row.emphasized ? "bold" : "normal");
        doc.setFontSize(8);
        doc.text(row.label, x + 5, currentY);

        setTextColor(
            doc,
            row.emphasized && emphasizedBackground
                ? getContrastingTextColor(emphasizedBackground)
                : palette.ink
        );
        doc.setFont("helvetica", "bold");
        doc.setFontSize(row.emphasized ? 10.5 : 9);
        doc.text(row.value, x + width - 5, currentY, { align: "right" });

        if (index < rows.length - 1) {
            setDrawColor(doc, palette.border);
            doc.setLineWidth(0.1);
            doc.line(x + 5, currentY + 3, x + width - 5, currentY + 3);
        }

        currentY += row.emphasized ? 9 : 8;
    });

    return height;
}

function drawParagraphCard(
    doc: jsPDF,
    options: {
        x: number;
        y: number;
        width: number;
        title: string;
        body: string;
        palette: BrandPalette;
        accentColor?: string | null;
    }
) {
    const { x, y, width, title, body, palette, accentColor } = options;
    const text = body.trim();

    if (!text) {
        return 0;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const wrapped = doc.splitTextToSize(text, width - 10);
    const height = 15 + wrapped.length * 4.8 + 8;

    drawCardShell(doc, x, y, width, height, palette, accentColor);
    setTextColor(doc, palette.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(title.toUpperCase(), x + 5, y + 9.5);

    setTextColor(doc, palette.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(wrapped, x + 5, y + 16);

    return height;
}

function drawBankTransferCard(
    doc: jsPDF,
    options: {
        x: number;
        y: number;
        width: number;
        businessDetails: DocumentBrandDetails;
        palette: BrandPalette;
    }
) {
    const { x, y, width, businessDetails, palette } = options;
    const rows = [
        { label: "Account Name", value: normalizeOptionalText(businessDetails.bankAccountName) },
        { label: "Sort Code", value: normalizeOptionalText(businessDetails.bankSortCode) },
        { label: "Account Number", value: normalizeOptionalText(businessDetails.bankAccountNumber) },
    ].filter((row) => row.value) as DetailRow[];

    if (rows.length === 0) {
        return 0;
    }

    return drawDetailCard(doc, {
        x,
        y,
        width,
        title: "Bank Transfer Details",
        rows,
        palette,
        accentColor: null,
    });
}

function addFooters(
    doc: jsPDF,
    businessDetails: DocumentBrandDetails,
    palette: BrandPalette,
    pdfSettings: DocumentPdfSettings
) {
    if (!pdfSettings.showFooter) {
        return;
    }

    const businessDetailsText = pdfSettings.showBusinessDetails
        ? [getCompanyName(businessDetails), buildBusinessContactLine(businessDetails)]
              .filter(Boolean)
              .join(" | ")
        : "";
    const footerText = [pdfSettings.footerText, businessDetailsText]
        .filter(Boolean)
        .join(" | ");
    const pageCount = doc.getNumberOfPages();

    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
        doc.setPage(pageIndex);
        setDrawColor(doc, palette.primary);
        doc.line(MARGIN, FOOTER_Y - 3, PAGE_WIDTH - MARGIN, FOOTER_Y - 3);

        setTextColor(doc, palette.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        if (footerText) {
            doc.text(footerText, MARGIN, FOOTER_Y, {
                maxWidth: CONTENT_WIDTH - 38,
            });
        }
        doc.text(`Page ${pageIndex} of ${pageCount}`, PAGE_WIDTH - MARGIN, FOOTER_Y, {
            align: "right",
        });
    }
}

function getQuoteStatusColor(status: Quote["status"], palette: BrandPalette) {
    switch (status) {
        case "Accepted":
            return palette.success;
        case "Declined":
            return palette.danger;
        case "Sent":
            return palette.info;
        case "Approved":
            return palette.warning;
        default:
            return palette.primary;
    }
}

function getInvoiceStatusColor(status: Invoice["status"], palette: BrandPalette) {
    switch (status) {
        case "Paid":
        case "Accepted":
            return palette.success;
        case "Declined":
            return palette.danger;
        case "Sent":
            return palette.info;
        case "Approved":
        case "Unpaid":
            return palette.warning;
        default:
            return palette.primary;
    }
}

const UNSUPPORTED_COLOR_FUNCTION_PATTERN =
    /\b(?:lab|lch|oklab|oklch|color)\([^)]*\)/gi;
const PDF_SAFE_STYLE_PROPERTIES = new Set([
    "display",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "z-index",
    "width",
    "height",
    "min-width",
    "min-height",
    "max-width",
    "max-height",
    "box-sizing",
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "border",
    "border-top",
    "border-right",
    "border-bottom",
    "border-left",
    "border-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "border-style",
    "border-top-style",
    "border-right-style",
    "border-bottom-style",
    "border-left-style",
    "border-width",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "border-radius",
    "background",
    "background-color",
    "background-image",
    "background-position",
    "background-repeat",
    "background-size",
    "color",
    "opacity",
    "font",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "font-variant",
    "line-height",
    "letter-spacing",
    "text-align",
    "text-transform",
    "text-decoration",
    "text-indent",
    "white-space",
    "word-break",
    "overflow",
    "overflow-x",
    "overflow-y",
    "vertical-align",
    "list-style",
    "list-style-type",
    "list-style-position",
    "flex",
    "flex-basis",
    "flex-direction",
    "flex-grow",
    "flex-shrink",
    "flex-wrap",
    "align-items",
    "align-content",
    "align-self",
    "justify-content",
    "justify-items",
    "gap",
    "row-gap",
    "column-gap",
    "grid",
    "grid-template",
    "grid-template-columns",
    "grid-template-rows",
    "grid-column",
    "grid-row",
    "grid-auto-flow",
    "grid-auto-columns",
    "grid-auto-rows",
    "place-items",
    "place-content",
    "transform",
    "transform-origin",
    "box-shadow",
    "filter",
    "object-fit",
    "object-position",
    "visibility",
]);

function waitForNextFrame() {
    return new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
    });
}

function hasBalancedParentheses(value: string) {
    let depth = 0;

    for (const character of value) {
        if (character === "(") {
            depth += 1;
        } else if (character === ")") {
            depth -= 1;

            if (depth < 0) {
                return false;
            }
        }
    }

    return depth === 0;
}

function isSafeCssValue(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
        return false;
    }

    if (!hasBalancedParentheses(trimmed)) {
        return false;
    }

    return !/var\(/i.test(trimmed);
}

function normalizeUnsupportedCssValue(
    property: string,
    value: string,
    probe: HTMLDivElement
) {
    if (!UNSUPPORTED_COLOR_FUNCTION_PATTERN.test(value)) {
        return value;
    }

    UNSUPPORTED_COLOR_FUNCTION_PATTERN.lastIndex = 0;
    probe.style.setProperty(property, "");

    try {
        probe.style.setProperty(property, value);
    } catch (_error) {
        probe.style.removeProperty(property);
        return property.includes("shadow") ? "rgba(0, 0, 0, 0)" : "rgb(0, 0, 0)";
    }

    const normalized = window.getComputedStyle(probe).getPropertyValue(property).trim();
    probe.style.removeProperty(property);

    if (normalized && !UNSUPPORTED_COLOR_FUNCTION_PATTERN.test(normalized)) {
        return normalized;
    }

    UNSUPPORTED_COLOR_FUNCTION_PATTERN.lastIndex = 0;

    return value.replace(
        UNSUPPORTED_COLOR_FUNCTION_PATTERN,
        property.includes("shadow") ? "rgba(0, 0, 0, 0)" : "rgb(0, 0, 0)"
    );
}

function inlineResolvedStyles(root: HTMLElement) {
    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.left = "-10000px";
    probe.style.top = "0";
    probe.style.width = "1px";
    probe.style.height = "1px";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);

    try {
        const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];

        elements.forEach((element) => {
            if (
                element instanceof HTMLStyleElement ||
                element instanceof HTMLLinkElement ||
                element instanceof HTMLScriptElement
            ) {
                return;
            }

            const computed = window.getComputedStyle(element);
            const nextStyles: string[] = [];

            for (let index = 0; index < computed.length; index += 1) {
                const property = computed.item(index);

                if (
                    !property ||
                    property.startsWith("--") ||
                    !PDF_SAFE_STYLE_PROPERTIES.has(property)
                ) {
                    continue;
                }

                let value = computed.getPropertyValue(property);

                if (!value) {
                    continue;
                }

                value = normalizeUnsupportedCssValue(property, value, probe);

                if (!isSafeCssValue(value)) {
                    continue;
                }

                nextStyles.push(`${property}: ${value};`);
            }

            element.setAttribute("style", nextStyles.join(" "));
        });
    } finally {
        probe.remove();
    }

    root.querySelectorAll("style, link[rel='stylesheet'], script").forEach((node) => {
        node.remove();
    });
}

async function buildTemplateContainer(html: string) {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const container = document.createElement("div");

    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    container.style.width = "794px";
    container.style.background = "#ffffff";
    container.style.pointerEvents = "none";

    parsed.head.querySelectorAll("style").forEach((node) => {
        const styleElement = document.createElement("style");
        styleElement.textContent = node.textContent || "";
        container.appendChild(styleElement);
    });

    const bodyWrapper = document.createElement("div");
    bodyWrapper.innerHTML = parsed.body.innerHTML;

    while (bodyWrapper.firstChild) {
        container.appendChild(bodyWrapper.firstChild);
    }

    document.body.appendChild(container);

    await waitForNextFrame();
    inlineResolvedStyles(container);
    await waitForNextFrame();

    return container;
}

async function generatePdfFromTemplate(
    filename: string,
    html: string
) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const container = await buildTemplateContainer(html);
    container.setAttribute("data-pdf-template-root", "true");

    try {
        await doc.html(container, {
            x: 0,
            y: 0,
            width: PAGE_WIDTH,
            windowWidth: 794,
            margin: [0, 0, 0, 0],
            autoPaging: "text",
            html2canvas: {
                scale: 0.8,
                useCORS: true,
                backgroundColor: "#ffffff",
                onclone: (clonedDoc) => {
                    clonedDoc
                        .querySelectorAll("style, link[rel='stylesheet'], script")
                        .forEach((node) => node.remove());

                    const clonedRoot = clonedDoc.querySelector<HTMLElement>(
                        "[data-pdf-template-root='true']"
                    );

                    if (clonedRoot) {
                        clonedDoc.body.innerHTML = "";
                        clonedDoc.body.style.margin = "0";
                        clonedDoc.body.style.background = "#ffffff";
                        clonedDoc.body.appendChild(clonedRoot);
                    }
                },
            },
        });

        doc.save(filename);
    } finally {
        container.remove();
    }
}

function getQuotePdfFilename(quote: Quote) {
    return `${quote.quoteNumber || quote.id}.pdf`;
}

function getInvoicePdfFilename(invoice: Invoice) {
    return `${invoice.invoiceNumber || invoice.id}.pdf`;
}

async function buildQuotePdfDocument(
    quote: Quote,
    businessDetails: DocumentBrandDetails = {}
) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const palette = getBrandPalette(businessDetails);
    const pdfSettings = getDocumentPdfSettings(businessDetails);
    const logoAsset = pdfSettings.showLogo
        ? await loadLogoAsset(businessDetails.logoUrl)
        : null;
    const customerLines = buildCustomerLines(quote, true);
    const siteLines = buildSiteLines(quote);
    const businessCardLines = [
        getCompanyName(businessDetails),
        buildBusinessContactLine(businessDetails),
    ].filter(Boolean) as string[];

    let y = drawDocumentHeader(doc, {
        title: "Quote",
        documentNumber: quote.quoteNumber,
        palette,
        logoAsset,
        brandName: getCompanyName(businessDetails),
        logoBackground: pdfSettings.logoBackground,
        logoScale: pdfSettings.logoScale,
        subtitleLines: [],
        boxedTitle: pdfSettings.headerStyle === "letterhead",
        showDocumentNumber: false,
        titleColor: "#ffffff",
    });

    const customerPanelWidth = 98;
    const infoBoxWidth = 38;
    const infoBoxGap = 4;
    const topSectionGap = 6;
    const infoBoxX = PAGE_WIDTH - MARGIN - infoBoxWidth * 2 - infoBoxGap;
    const customerPanelHeight = drawRecipientPanel(doc, {
        x: MARGIN,
        y,
        width: customerPanelWidth,
        label: "Prepared For",
        lines: customerLines,
        palette,
        showLabel: false,
        plain: true,
    });
    const rowOneHeights = [
        drawInfoBox(doc, {
            x: infoBoxX,
            y,
            width: infoBoxWidth,
            label: "Quote No",
            value: quote.quoteNumber,
            palette,
            showAccent: false,
        }),
        drawInfoBox(doc, {
            x: infoBoxX + infoBoxWidth + infoBoxGap,
            y,
            width: infoBoxWidth,
            label: "Date",
            value: formatDate(quote.date),
            palette,
            showAccent: false,
        }),
    ];
    const rowTwoY = y + Math.max(...rowOneHeights) + 4;
    const rowTwoHeights = [
        drawInfoBox(doc, {
            x: infoBoxX,
            y: rowTwoY,
            width: infoBoxWidth,
            label: "Type",
            value: quote.customerType ?? "Residential",
            palette,
            showAccent: false,
        }),
        drawInfoBox(doc, {
            x: infoBoxX + infoBoxWidth + infoBoxGap,
            y: rowTwoY,
            width: infoBoxWidth,
            label: "Status",
            value: quote.status,
            palette,
            showAccent: false,
        }),
    ];
    const quoteDetailHeight = rowTwoY - y + Math.max(...rowTwoHeights);

    y += Math.max(customerPanelHeight, quoteDetailHeight) + 8;

    const fromCardHeight = drawTextCard(doc, {
        x: MARGIN,
        y,
        width: (CONTENT_WIDTH - topSectionGap) / 2,
        title: "From",
        lines: businessCardLines,
        palette,
        accentColor: null,
    });
    const rightCardHeight = drawTextCard(doc, {
        x: MARGIN + (CONTENT_WIDTH - topSectionGap) / 2 + topSectionGap,
        y,
        width: (CONTENT_WIDTH - topSectionGap) / 2,
        title: siteLines.length > 0 ? "Service Location" : "Notes",
        lines:
            siteLines.length > 0
                ? siteLines
                : [
                      quote.notes?.trim() ||
                          businessDetails.defaultQuoteTerms?.trim() ||
                          "Thank you for considering us.",
                  ],
        palette,
        accentColor: null,
    });
    y += Math.max(fromCardHeight, rightCardHeight) + 8;

    y = drawItemsTable(doc, quote.items, y, palette, "", { showRate: false });

    const bottomStartY = ensurePageSpace(doc, y, 70);
    const notesWidth = 114;
    let leftColumnHeight = 0;

    if (siteLines.length > 0 && quote.notes?.trim()) {
        leftColumnHeight += drawParagraphCard(doc, {
            x: MARGIN,
            y: bottomStartY,
            width: notesWidth,
            title: "Notes",
            body: quote.notes,
            palette,
            accentColor: null,
        });
    } else if (businessDetails.termsAndConditionsUrl?.trim()) {
        leftColumnHeight += drawParagraphCard(doc, {
            x: MARGIN,
            y: bottomStartY,
            width: notesWidth,
            title: "Terms",
            body: `Terms and conditions: ${businessDetails.termsAndConditionsUrl.trim()}`,
            palette,
            accentColor: null,
        });
    }

    if (leftColumnHeight > 0) {
        leftColumnHeight += 6;
    }

    drawSimpleTotalBox(doc, {
        x: PAGE_WIDTH - MARGIN - 62,
        y: bottomStartY,
        width: 62,
        label: "Total",
        value: formatMoney(Number(quote.total || 0)),
        palette,
    });

    addFooters(doc, businessDetails, palette, pdfSettings);
    return doc;
}

export async function generateQuotePDF(
    quote: Quote,
    businessDetails: DocumentBrandDetails = {}
) {
    const doc = await buildQuotePdfDocument(quote, businessDetails);
    doc.save(getQuotePdfFilename(quote));
}

export async function getQuotePdfBlob(
    quote: Quote,
    businessDetails: DocumentBrandDetails = {}
) {
    const doc = await buildQuotePdfDocument(quote, businessDetails);
    return doc.output("blob") as Blob;
}

async function buildInvoicePdfDocument(
    invoice: Invoice,
    businessDetails: DocumentBrandDetails
) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const palette = getBrandPalette(businessDetails);
    const pdfSettings = getDocumentPdfSettings(businessDetails);
    const logoAsset = pdfSettings.showLogo
        ? await loadLogoAsset(businessDetails.logoUrl)
        : null;
    const paymentBadgeAsset = invoice.stripePaymentLinkUrl?.trim()
        ? await loadLogoAsset(STRIPE_SECURE_PAYMENT_LOGO_URL)
        : null;
    const customerLines = buildCustomerLines(invoice, true);
    const siteLines = buildSiteLines(invoice);
    const businessCardLines = [
        getCompanyName(businessDetails),
        buildBusinessContactLine(businessDetails),
    ].filter(Boolean) as string[];
    const subtotal = getSubtotal(invoice.items);
    const vatAmount = Number(invoice.vatAmount ?? 0);

    let y = drawDocumentHeader(doc, {
        title: "Invoice",
        documentNumber: invoice.invoiceNumber,
        palette,
        logoAsset,
        brandName: getCompanyName(businessDetails),
        logoBackground: pdfSettings.logoBackground,
        logoScale: pdfSettings.logoScale,
        subtitleLines: [],
        boxedTitle: pdfSettings.headerStyle === "letterhead",
        showDocumentNumber: false,
        titleColor: "#ffffff",
    });

    const customerPanelWidth = 98;
    const infoBoxWidth = 38;
    const infoBoxGap = 4;
    const topSectionGap = 6;
    const infoBoxX = PAGE_WIDTH - MARGIN - infoBoxWidth * 2 - infoBoxGap;
    const customerPanelHeight = drawRecipientPanel(doc, {
        x: MARGIN,
        y,
        width: customerPanelWidth,
        label: "Prepared For",
        lines: customerLines,
        palette,
        showLabel: false,
        plain: true,
    });
    const rowOneHeights = [
        drawInfoBox(doc, {
            x: infoBoxX,
            y,
            width: infoBoxWidth,
            label: "Invoice No",
            value: invoice.invoiceNumber,
            palette,
            showAccent: false,
        }),
        drawInfoBox(doc, {
            x: infoBoxX + infoBoxWidth + infoBoxGap,
            y,
            width: infoBoxWidth,
            label: "Date",
            value: formatDate(invoice.date),
            palette,
            showAccent: false,
        }),
    ];
    const rowTwoY = y + Math.max(...rowOneHeights) + 4;
    const rowTwoHeights = [
        drawInfoBox(doc, {
            x: infoBoxX,
            y: rowTwoY,
            width: infoBoxWidth,
            label: "Due By",
            value: formatDate(invoice.dueDate),
            palette,
            showAccent: false,
        }),
        drawInfoBox(doc, {
            x: infoBoxX + infoBoxWidth + infoBoxGap,
            y: rowTwoY,
            width: infoBoxWidth,
            label: "Status",
            value: invoice.status,
            palette,
            showAccent: false,
        }),
    ];
    const invoiceDetailHeight = rowTwoY - y + Math.max(...rowTwoHeights);

    y += Math.max(customerPanelHeight, invoiceDetailHeight) + 8;

    const secondaryCardWidth = (CONTENT_WIDTH - topSectionGap) / 2;
    const fromCardHeight = drawTextCard(doc, {
        x: MARGIN,
        y,
        width: secondaryCardWidth,
        title: "From",
        lines: businessCardLines,
        palette,
        accentColor: null,
    });
    const rightCardHeight = drawTextCard(doc, {
        x: MARGIN + secondaryCardWidth + topSectionGap,
        y,
        width: secondaryCardWidth,
        title: siteLines.length > 0 ? "Service Location" : "Notes",
        lines:
            siteLines.length > 0
                ? siteLines
                : [
                      invoice.notes?.trim() ||
                          "Please use the invoice number as your payment reference.",
                  ],
        palette,
        accentColor: null,
    });
    y += Math.max(fromCardHeight, rightCardHeight) + 8;

    y = drawItemsTable(doc, invoice.items, y, palette, "");

    const paymentLinkUrl = invoice.stripePaymentLinkUrl?.trim();
    const bottomStartY = ensurePageSpace(doc, y, paymentLinkUrl ? 116 : 86);
    const leftColumnWidth = 114;
    let nextLeftY = bottomStartY;

    if (paymentLinkUrl) {
        const paymentLinkHeight = drawPaymentBadgeCard(doc, {
            x: MARGIN,
            y: nextLeftY,
            width: leftColumnWidth,
            paymentBadgeAsset,
            palette,
        });
        nextLeftY += paymentLinkHeight + 6;
    }

    const bankHeight = drawBankTransferCard(doc, {
        x: MARGIN,
        y: nextLeftY,
        width: leftColumnWidth,
        businessDetails,
        palette,
    });

    if (bankHeight > 0) {
        nextLeftY += bankHeight + 6;
    }

    if (siteLines.length > 0 && invoice.notes?.trim()) {
        const notesHeight = drawParagraphCard(doc, {
            x: MARGIN,
            y: nextLeftY,
            width: leftColumnWidth,
            title: "Notes",
            body: invoice.notes,
            palette,
            accentColor: null,
        });
        nextLeftY += notesHeight + 6;
    }

    const invoiceTerms =
        invoice.terms?.trim() || businessDetails.defaultInvoiceTerms?.trim();

    if (invoiceTerms) {
        drawParagraphCard(doc, {
            x: MARGIN,
            y: nextLeftY,
            width: leftColumnWidth,
            title: "Terms",
            body: invoiceTerms,
            palette,
            accentColor: null,
        });
    } else if (businessDetails.termsAndConditionsUrl?.trim()) {
        drawParagraphCard(doc, {
            x: MARGIN,
            y: nextLeftY,
            width: leftColumnWidth,
            title: "Terms",
            body: `Terms and conditions: ${businessDetails.termsAndConditionsUrl.trim()}`,
            palette,
            accentColor: null,
        });
    }

    drawSummaryCard(doc, {
        x: PAGE_WIDTH - MARGIN - 62,
        y: bottomStartY,
        width: 62,
        title: "Total",
        rows: [
            { label: "Subtotal", value: formatMoney(subtotal) },
            ...(vatAmount > 0
                ? [{ label: `VAT (${Number(invoice.vatRate ?? 0)}%)`, value: formatMoney(vatAmount) }]
                : []),
            { label: "Total Due", value: formatMoney(Number(invoice.total || 0)), emphasized: true },
        ],
        palette,
        accentColor: palette.secondary,
        emphasizedBackground: palette.secondary,
    });

    addFooters(doc, businessDetails, palette, pdfSettings);
    return doc;
}

export async function generateInvoicePDF(
    invoice: Invoice,
    businessDetails: DocumentBrandDetails
) {
    const doc = await buildInvoicePdfDocument(invoice, businessDetails);
    doc.save(getInvoicePdfFilename(invoice));
}

export async function getInvoicePdfBlob(
    invoice: Invoice,
    businessDetails: DocumentBrandDetails
) {
    const doc = await buildInvoicePdfDocument(invoice, businessDetails);
    return doc.output("blob") as Blob;
}
