// src/component/invoice.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { AntDesign } from '@expo/vector-icons';

const generateInvoiceHTML = (order) => {
  if (!order) return '';
  console.log("order hai ye ",order);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotal = () => {
    if (!order.services || !Array.isArray(order.services)) return 0;
    return order.services.reduce((sum, service) => sum + (service.lineTotal || 0), 0);
  };

  const totalAmount = calculateTotal();
  const gstAmount = Number((totalAmount * 0.18).toFixed(2)); // 18% GST
  const subTotal = Number((totalAmount - gstAmount).toFixed(2));
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(order.orderId || '').padStart(5, '0')}`;
  const paymentStatus = order.status === 'completed' ? 'PAID' : 'PENDING';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice #${invoiceNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          body {
            margin: 0;
            padding: 10mm 15mm;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        body {
          font-family: 'Poppins', Arial, sans-serif;
          line-height: 1.4;
          color: #2d3748;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 10mm 15mm;
          background: white;
          font-size: 12px;
          box-sizing: border-box;
        }
        .header {
          background: linear-gradient(135deg, #F08383, #f7b5b5);
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 15px;
          position: relative;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 200%;
          background: rgba(255, 255, 255, 0.1);
          transform: rotate(30deg);
          pointer-events: none;
        }
        .invoice-title {
          font-size: 20px;
          font-weight: 700;
          margin: 5px 0;
          color: white;
          letter-spacing: 0.3px;
        }
        .invoice-number {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.9);
          background: rgba(0, 0, 0, 0.1);
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          margin-top: 8px;
          font-weight: 500;
        }
        .company-info {
          margin: 15px 0 25px;
          text-align: center;
        }
        .company-name {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 5px;
          color: white;
          letter-spacing: 0.3px;
        }
        .billing-info {
          display: flex;
          justify-content: space-between;
          margin: 15px 0;
          flex-wrap: wrap;
          gap: 10px;
        }
        .info-box {
          flex: 1;
          min-width: 45%;
          padding: 10px 15px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-size: 11px;
        }
        .info-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .info-box h3 {
          margin: 0 0 15px 0;
          color: #F08383;
          font-size: 16px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e2e8f0;
          position: relative;
        }
        .info-box h3::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -2px;
          width: 50px;
          height: 2px;
          background: #F08383;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          background: white;
          font-size: 11px;
          page-break-inside: avoid;
        }
        th, td {
          padding: 8px 10px;
          text-align: left;
          border: 1px solid #e2e8f0;
          vertical-align: middle;
        }
        th {
          background-color: #F08383;
          color: white;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 13px;
          letter-spacing: 0.5px;
        }
        tr:last-child td {
          border-bottom: none;
        }
        tr:hover td {
          background-color: #f8fafc;
        }
        .text-right {
          text-align: right;
        }
        .total-section {
          margin-top: 15px;
          float: right;
          width: 45%;
          background: white;
          border-radius: 6px;
          padding: 12px 15px;
          border: 1px solid #e2e8f0;
          font-size: 11px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 12px 0;
          padding: 8px 0;
          font-size: 15px;
        }
        .total-row:not(:last-child) {
          border-bottom: 1px dashed #e2e8f0;
        }
        .total-label {
          font-weight: 500;
          color: #4a5568;
        }
        .total-amount {
          font-weight: 600;
          color: #2d3748;
        }
        .total-row:last-child {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 2px solid #F08383;
        }
        .total-row:last-child .total-amount {
          color: #F08383;
          font-size: 1.2em;
          font-weight: 700;
        }
        .footer {
          position: absolute;
          bottom: 10mm;
          left: 15mm;
          right: 15mm;
          text-align: center;
          color: #718096;
          font-size: 10px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
        }
        .footer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 3px;
          background: linear-gradient(90deg, #F08383, #f7b5b5);
          border-radius: 3px;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background-color: ${order.status === 'completed' ? '#10b981' : order.status === 'cancelled' ? '#ef4444' : '#f59e0b'}1a;
          color: ${order.status === 'completed' ? '#059669' : order.status === 'cancelled' ? '#dc2626' : '#d97706'};
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .status-badge::before {
          content: '';
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: ${order.status === 'completed' ? '#10b981' : order.status === 'cancelled' ? '#ef4444' : '#f59e0b'};
          margin-right: 6px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div>
            <div class="company-name" style="font-size: 16px; margin-bottom: 5px;">${order.storeName || 'Laundry Service'}</div>
            <div style="color: rgba(255, 255, 255, 0.9); font-size: 11px; margin-bottom: 5px;">
              <i class="fas fa-phone" style="margin-right: 5px;"></i> ${order.storePhone || 'Contact: N/A'}
            </div>
          </div>
          <div style="text-align: right;">
            <div class="invoice-title" style="margin: 0 0 5px 0;">TAX INVOICE</div>
            <div class="invoice-number" style="font-size: 12px; margin: 0;">${invoiceNumber}</div>
            <div style="margin-top: 5px; display: flex; justify-content: flex-end; gap: 8px;">
              <span class="status-badge" style="font-size: 10px; padding: 3px 8px;">${order.status || 'N/A'}</span>
              ${paymentStatus === 'PAID' ? '<span class="status-badge" style="background-color: #10b9811a; color: #059669; font-size: 10px; padding: 3px 8px;">Paid</span>' : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="billing-info">
        <div class="info-box">
          <h3>Billing Information</h3>
          <p>
            ${order.deliveryAddress ? 
              `${order.deliveryAddress.addressLine || ''}<br>
              ${order.deliveryAddress.landmark ? order.deliveryAddress.landmark + '<br>' : ''}
              ${order.deliveryAddress.city || ''}, ${order.deliveryAddress.state || ''}<br>
              ${order.deliveryAddress.pincode || ''}` 
              : 'N/A'}
          </p>
        </div>
        <div class="info-box">
          <h3>Order Details</h3>
          <p>
            <strong>Order Date:</strong> ${formatDate(order.createdAt)}<br>
            <strong>Status:</strong> <span class="status-badge">${order.status || 'N/A'}</span><br>
            ${order.deliveredAt ? `<strong>Delivered On:</strong> ${formatDate(order.deliveredAt)}<br>` : ''}
          </p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Quantity</th>
            <th>Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.services && Array.isArray(order.services) ? 
            order.services.map(service => `
              <tr>
                <td>${service.name || 'N/A'}</td>
                <td>${service.quantity || 0}</td>
                <td>₹${service.price ? service.price.toFixed(2) : '0.00'}</td>
                <td class="text-right">₹${service.lineTotal ? service.lineTotal.toFixed(2) : '0.00'}</td>
              </tr>
            `).join('')
            : '<tr><td colspan="4">No services found</td></tr>'
          }
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-row">
          <span class="total-label">Subtotal:</span>
          <span>₹${subTotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">GST (18%):</span>
          <span>₹${gstAmount.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Total:</span>
          <span class="total-amount">₹${totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div style="clear: both;"></div>

      <div class="footer">
        <div>
          <p style="margin: 2px 0; font-size: 10px; color: #4a5568;">
            <strong>Thank you for choosing ${order.storeName || 'our service'}!</strong>
          </p>
          <p style="margin: 2px 0; font-size: 9px; color: #a0aec0;">
            This is a computer-generated invoice. No signature required. Generated on: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const Invoice = ({ order, onClose }) => {
  console.log(order);
  const [isProcessing, setIsProcessing] = React.useState(false);

 const handleDownload = async () => {
  if (!order) return;

  setIsProcessing(true);

  try {
    const html = generateInvoiceHTML(order);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Directly share the generated PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Invoice #${order.orderId}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Invoice Generated', `Saved at:\n${uri}`);
    }

  } catch (error) {
    console.error('Invoice error:', error);
    Alert.alert('Error', 'Failed to generate invoice');
  } finally {
    setIsProcessing(false);
  }
};


  const handlePrint = async () => {
    if (!order) return;
    
    try {
      const html = generateInvoiceHTML(order);
      await Print.printAsync({
        html: html,
        width: 612,   // 8.5 inches in points
        height: 792,  // 11 inches in points
      });
    } catch (error) {
      console.error('Error printing invoice:', error);
      Alert.alert('Error', 'Failed to print invoice. Please try again.');
    }
  };

  if (!order) return null;

  return (
    <View style={styles.container}>
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Invoice #{order.orderId}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <AntDesign name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.downloadButton]}
            onPress={handleDownload}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <AntDesign name="download" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.printButton]}
            onPress={handlePrint}
            disabled={isProcessing}
          >
            <AntDesign name="printer" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Print</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.previewContainer}>
          <Text style={styles.previewText}>Preview:</Text>
          <View style={styles.invoicePreview}>
            {/* Simple preview of the invoice */}
            <Text style={styles.previewTitle}>INVOICE #{order.orderId}</Text>
            <Text style={styles.previewDate}>Date: {new Date(order.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.previewStatus}>Status: {order.status}</Text>
            <Text style={styles.previewTotal}>Total: ₹{order.services?.reduce((sum, s) => sum + (s.lineTotal || 0), 0).toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  downloadButton: {
    backgroundColor: '#4CAF50',
  },
  printButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 5,
  },
  previewContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 15,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555',
  },
  invoicePreview: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 6,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  previewDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  previewStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  previewTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 8,
  },
});

export default Invoice;