const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const TRIBO_API_URL = 'https://api.tribopay.com.br/api/public/v1';
const API_TOKEN = process.env.TRIBO_API_TOKEN;

// Rota para gerar o Pix
app.post('/api/pix', async (req, res) => {
    try {
        const { payer_name, payer_cpf, payer_phone, amount } = req.body;

        // Converter valor para centavos (ex: 89.47 -> 8947)
        const amountInCents = Math.round(parseFloat(amount) * 100);

        const payload = {
            amount: amountInCents,
            offer_hash: process.env.TRIBO_OFFER_HASH || '7becb', // Offer hash padrão ou da env
            payment_method: 'pix',
            customer: {
                name: payer_name,
                email: 'cliente@email.com', // Email genérico se não fornecido
                phone_number: payer_phone.replace(/\D/g, ''),
                document: payer_cpf.replace(/\D/g, '')
            },
            cart: [
                {
                    product_hash: process.env.TRIBO_PRODUCT_HASH || 'product_123',
                    title: 'Produto Checkout',
                    price: amountInCents,
                    quantity: 1,
                    operation_type: 1,
                    tangible: false
                }
            ],
            expire_in_days: 1,
            transaction_origin: 'api'
        };

        const response = await axios.post(`${TRIBO_API_URL}/transactions?api_token=${API_TOKEN}`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (response.data && response.data.payment_status) {
            res.json({
                success: true,
                pixCode: response.data.pix.pix_qr_code,
                qrCode: response.data.pix.pix_qr_code,
                hash: response.data.hash
            });
        } else {
            console.error('TriboPay Error Response:', response.data);
            res.status(400).json({ success: false, message: 'Erro na resposta da TriboPay' });
        }
    } catch (error) {
        console.error('Server Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno ao gerar Pix',
            details: error.response ? error.response.data : error.message 
        });
    }
});

// Servir o index.html em qualquer rota não-API
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
