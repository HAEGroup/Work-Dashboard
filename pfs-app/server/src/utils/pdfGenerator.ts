import puppeteer from 'puppeteer';
import { prisma } from '../config/database';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

const ASSET_CATEGORY_LABELS: Record<string, string> = {
  CASH_AND_EQUIVALENTS: 'Cash & Equivalents',
  INVESTMENTS: 'Investments',
  RETIREMENT_ACCOUNTS: 'Retirement Accounts',
  REAL_ESTATE: 'Real Estate',
  VEHICLES: 'Vehicles',
  BUSINESS_INTERESTS: 'Business Interests',
  PERSONAL_PROPERTY: 'Personal Property',
  LIFE_INSURANCE_CSV: 'Life Insurance (CSV)',
  OTHER: 'Other Assets',
};

const LIABILITY_CATEGORY_LABELS: Record<string, string> = {
  MORTGAGE: 'Mortgage',
  HOME_EQUITY_LOAN: 'Home Equity Loan',
  AUTO_LOAN: 'Auto Loan',
  STUDENT_LOAN: 'Student Loan',
  CREDIT_CARD: 'Credit Card',
  BUSINESS_LOAN: 'Business Loan',
  PERSONAL_LOAN: 'Personal Loan',
  TAX_LIABILITY: 'Tax Liability',
  OTHER: 'Other Liabilities',
};

export async function generateStatementPdf(statementId: string, userId: string): Promise<Buffer> {
  const statement = await prisma.statement.findFirst({
    where: { id: statementId, userId },
    include: {
      assets: { orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] },
      liabilities: { orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] },
    },
  });

  if (!statement) {
    throw new Error('Statement not found');
  }

  const totalAssets = statement.assets.reduce((s, a) => s + Number(a.value), 0);
  const totalLiabilities = statement.liabilities.reduce((s, l) => s + Number(l.balance), 0);
  const netWorth = totalAssets - totalLiabilities;

  // Group assets by category
  const assetsByCategory = new Map<string, typeof statement.assets>();
  for (const asset of statement.assets) {
    const cat = asset.category;
    if (!assetsByCategory.has(cat)) assetsByCategory.set(cat, []);
    assetsByCategory.get(cat)!.push(asset);
  }

  // Group liabilities by category
  const liabilitiesByCategory = new Map<string, typeof statement.liabilities>();
  for (const liability of statement.liabilities) {
    const cat = liability.category;
    if (!liabilitiesByCategory.has(cat)) liabilitiesByCategory.set(cat, []);
    liabilitiesByCategory.get(cat)!.push(liability);
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a1a1a; padding-bottom: 15px; }
    .header h1 { font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .header .date { font-size: 13px; margin-top: 5px; color: #555; }
    .personal-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px; margin-bottom: 25px; padding: 15px; background: #f8f9fa; border: 1px solid #dee2e6; }
    .personal-info .field { display: flex; }
    .personal-info .label { font-weight: 600; min-width: 100px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; background: #1a1a1a; color: white; padding: 6px 12px; margin-bottom: 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-weight: 600; padding: 5px 8px; border-bottom: 1px solid #999; font-size: 10px; text-transform: uppercase; color: #555; }
    td { padding: 4px 8px; border-bottom: 1px solid #eee; }
    .amount { text-align: right; font-family: 'Courier New', monospace; }
    .category-header td { font-weight: 600; background: #f0f0f0; padding: 5px 8px; font-size: 11px; }
    .subtotal td { font-weight: 600; border-top: 1px solid #999; }
    .grand-total td { font-weight: 700; font-size: 13px; border-top: 2px solid #1a1a1a; padding: 8px; }
    .net-worth { text-align: center; margin-top: 25px; padding: 15px; border: 2px solid #1a1a1a; }
    .net-worth .label { font-size: 14px; font-weight: 600; text-transform: uppercase; }
    .net-worth .value { font-size: 24px; font-weight: 700; font-family: 'Courier New', monospace; margin-top: 5px; }
    .net-worth .value.positive { color: #16a34a; }
    .net-worth .value.negative { color: #dc2626; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 9px; color: #777; text-align: center; }
    .signature-line { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature-line .sig { border-top: 1px solid #1a1a1a; width: 250px; padding-top: 5px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${statement.name}</h1>
    <div class="date">As of ${formatDate(statement.asOfDate)}</div>
  </div>

  ${statement.fullName ? `
  <div class="personal-info">
    ${statement.fullName ? `<div class="field"><span class="label">Name:</span> ${statement.fullName}</div>` : ''}
    ${statement.phone ? `<div class="field"><span class="label">Phone:</span> ${statement.phone}</div>` : ''}
    ${statement.address ? `<div class="field"><span class="label">Address:</span> ${statement.address}${statement.city ? `, ${statement.city}` : ''}${statement.state ? `, ${statement.state}` : ''} ${statement.zip || ''}</div>` : ''}
    ${statement.employer ? `<div class="field"><span class="label">Employer:</span> ${statement.employer}</div>` : ''}
    ${statement.jobTitle ? `<div class="field"><span class="label">Title:</span> ${statement.jobTitle}</div>` : ''}
    ${statement.annualSalary ? `<div class="field"><span class="label">Annual Salary:</span> ${formatCurrency(Number(statement.annualSalary))}</div>` : ''}
    ${statement.otherIncome ? `<div class="field"><span class="label">Other Income:</span> ${formatCurrency(Number(statement.otherIncome))}${statement.otherIncomeDesc ? ` (${statement.otherIncomeDesc})` : ''}</div>` : ''}
  </div>
  ` : ''}

  <div class="two-col">
    <div class="section">
      <div class="section-title">Assets</div>
      <table>
        <thead>
          <tr><th>Description</th><th class="amount">Value</th></tr>
        </thead>
        <tbody>
          ${Array.from(assetsByCategory.entries()).map(([cat, assets]) => {
            const catTotal = assets.reduce((s, a) => s + Number(a.value), 0);
            return `
              <tr class="category-header"><td colspan="2">${ASSET_CATEGORY_LABELS[cat] || cat}</td></tr>
              ${assets.map(a => `<tr><td>${a.description}</td><td class="amount">${formatCurrency(Number(a.value))}</td></tr>`).join('')}
              <tr class="subtotal"><td>Subtotal</td><td class="amount">${formatCurrency(catTotal)}</td></tr>
            `;
          }).join('')}
          <tr class="grand-total"><td>Total Assets</td><td class="amount">${formatCurrency(totalAssets)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Liabilities</div>
      <table>
        <thead>
          <tr><th>Description</th><th class="amount">Balance</th></tr>
        </thead>
        <tbody>
          ${Array.from(liabilitiesByCategory.entries()).map(([cat, liabilities]) => {
            const catTotal = liabilities.reduce((s, l) => s + Number(l.balance), 0);
            return `
              <tr class="category-header"><td colspan="2">${LIABILITY_CATEGORY_LABELS[cat] || cat}</td></tr>
              ${liabilities.map(l => `<tr><td>${l.description}${l.creditor ? ` — ${l.creditor}` : ''}</td><td class="amount">${formatCurrency(Number(l.balance))}</td></tr>`).join('')}
              <tr class="subtotal"><td>Subtotal</td><td class="amount">${formatCurrency(catTotal)}</td></tr>
            `;
          }).join('')}
          <tr class="grand-total"><td>Total Liabilities</td><td class="amount">${formatCurrency(totalLiabilities)}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="net-worth">
    <div class="label">Net Worth</div>
    <div class="value ${netWorth >= 0 ? 'positive' : 'negative'}">${formatCurrency(netWorth)}</div>
  </div>

  <div class="signature-line">
    <div class="sig">Signature</div>
    <div class="sig">Date</div>
  </div>

  <div class="footer">
    This personal financial statement was prepared for informational purposes. Generated on ${formatDate(new Date())}.
  </div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'Letter',
      margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
