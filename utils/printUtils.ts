export const printHTML = (htmlContent: string, title: string = 'Print', pageStyle: string = '@page { margin: 0; }') => {
  // Create an iframe to contain the print content
  const iframe = document.createElement('iframe');
  
  // Hide the iframe completely
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }
  
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          ${pageStyle}
          /* Page sizing is injected via JS configuration */
          body { 
            margin: 0; 
            padding: 20px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: inherit;
          }
          /* We'll use inline styles mostly to ensure print compatibility */
          .print-container {
            width: 100%;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          // Wait for any images/fonts to load
          window.onload = function() {
            setTimeout(function() {
              window.print();
              // Clean up after print dialog closes
              setTimeout(function() {
                window.parent.document.body.removeChild(window.frameElement);
              }, 1000);
            }, 250);
          };
        </script>
      </body>
    </html>
  `);
  iframeDoc.close();
};

export const formatCurrency = (amount: number) => `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const generateReceiptHTML = (transaction: any, profile: any, width: string = '80mm') => {
  const dateStr = new Date(transaction.createdAt).toLocaleDateString('en-GB');
  const timeStr = new Date(transaction.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const tenantName = profile?.tenant?.name || 'Main Pharmacy';
  const branchName = profile?.branch?.name || 'Terminal #01';
  const address = profile?.branch?.location || '';
  const phone = profile?.tenant?.phone || '';

  const itemsHtml = transaction.items.map((item: any) => `
    <div style="margin-bottom: 8px;">
      <div style="word-break: break-word;">${item.name}</div>
      <div style="display: flex; justify-content: space-between; font-size: 12px;">
        <span>${item.quantity} x ${formatCurrency(item.unitPrice)}</span>
        <span style="font-weight: bold;">${formatCurrency(item.total)}</span>
      </div>
    </div>
  `).join('');

  return `
    <div style="width: ${width}; font-family: monospace; font-size: 13px; line-height: 1.4; margin: 0 auto; color: black; background: white; padding: 10px;">
      
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 4px;">${tenantName}</div>
        <div style="font-size: 12px; margin-bottom: 6px;">${branchName}</div>
        ${address ? `<div style="font-size: 12px;">${address}</div>` : ''}
        ${phone ? `<div style="font-size: 12px;">Tel: ${phone}</div>` : ''}
      </div>

      <div style="border-top: 1px dashed black; margin: 12px 0;"></div>

      <div style="font-size: 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Receipt No:</span>
          <span style="font-weight: bold;">${transaction.receiptNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Date:</span>
          <span>${dateStr}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Time:</span>
          <span>${timeStr}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Cashier:</span>
          <span>${transaction.cashier}</span>
        </div>
        ${transaction.patientName ? `
        <div style="display: flex; justify-content: space-between;">
          <span>Patient:</span>
          <span>${transaction.patientName}</span>
        </div>` : ''}
      </div>

      <div style="border-top: 1px dashed black; margin: 12px 0;"></div>

      <div style="margin-bottom: 12px;">
        ${itemsHtml}
      </div>

      <div style="border-top: 1px dashed black; margin: 12px 0;"></div>

      <div style="font-size: 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Subtotal:</span>
          <span>${formatCurrency(transaction.subtotal)}</span>
        </div>
        ${transaction.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Discount:</span>
          <span>-${formatCurrency(transaction.discount)}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>VAT (7.5%):</span>
          <span>${formatCurrency(transaction.vat)}</span>
        </div>
        
        <div style="border-top: 1px solid black; margin: 8px 0;"></div>
        
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-bottom: 12px;">
          <span>TOTAL:</span>
          <span>${formatCurrency(transaction.total)}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Payment:</span>
          <span>${transaction.paymentMethod}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Amount Paid:</span>
          <span>${formatCurrency(transaction.amountPaid)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Change:</span>
          <span>${formatCurrency(transaction.change)}</span>
        </div>
      </div>

      <div style="border-top: 1px dashed black; margin: 12px 0;"></div>

      <div style="text-align: center; font-size: 12px;">
        <div style="margin-bottom: 8px;">Thank you for your patronage!</div>
        <div style="margin-bottom: 12px;">Get well soon</div>
        <div style="font-size: 10px; opacity: 0.6; margin-bottom: 4px;">Powered by PharmaCore</div>
      </div>
    </div>
  `;
};

export const generateReportHTML = (reportData: any) => {
  const { dateRange, startStr, endStr, avgBasketSize, inventoryTurnover, patientRetention, categoryData, salesTrendData } = reportData;

  const categoryHtml = categoryData.map((cat: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${cat.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${cat.value} units</td>
    </tr>
  `).join('');

  const trendHtml = salesTrendData.map((day: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${day.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(day.sales)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #006C75; padding-bottom: 20px;">
        <h1 style="color: #006C75; margin: 0 0 10px 0;">PharmaCore Business Report</h1>
        <p style="margin: 5px 0; color: #666;">Generated: ${new Date().toLocaleString()}</p>
        <p style="margin: 5px 0; color: #666;">Period: ${dateRange} (${startStr} - ${endStr})</p>
      </div>

      <h2 style="color: #006C75; border-bottom: 1px solid #eee; padding-bottom: 10px;">Key Metrics</h2>
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; width: 30%; text-align: center; border: 1px solid #e9ecef;">
          <div style="font-size: 14px; color: #6c757d; margin-bottom: 10px; text-transform: uppercase;">Avg Basket Size</div>
          <div style="font-size: 24px; font-weight: bold; color: #006C75;">${formatCurrency(avgBasketSize)}</div>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; width: 30%; text-align: center; border: 1px solid #e9ecef;">
          <div style="font-size: 14px; color: #6c757d; margin-bottom: 10px; text-transform: uppercase;">Inventory Turnover</div>
          <div style="font-size: 24px; font-weight: bold; color: #0ea5e9;">${inventoryTurnover.toFixed(1)}x</div>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; width: 30%; text-align: center; border: 1px solid #e9ecef;">
          <div style="font-size: 14px; color: #6c757d; margin-bottom: 10px; text-transform: uppercase;">Patient Retention</div>
          <div style="font-size: 24px; font-weight: bold; color: #10b981;">${patientRetention.toFixed(0)}%</div>
        </div>
      </div>

      <div style="display: flex; gap: 40px; margin-bottom: 40px;">
        <div style="flex: 1;">
          <h2 style="color: #006C75; border-bottom: 1px solid #eee; padding-bottom: 10px;">Sales by Category</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr>
                <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: left;">Category</th>
                <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Volume</th>
              </tr>
            </thead>
            <tbody>
              ${categoryHtml}
            </tbody>
          </table>
        </div>
        
        <div style="flex: 1;">
          <h2 style="color: #006C75; border-bottom: 1px solid #eee; padding-bottom: 10px;">Sales Trend</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr>
                <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: left;">Period</th>
                <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${trendHtml}
            </tbody>
          </table>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 50px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
        End of Report
      </div>
    </div>
  `;
};
