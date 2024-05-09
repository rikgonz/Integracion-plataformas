const express = require("express");
const app = express();
const axios = require("axios");
const bodyParser = require('body-parser');
const path = require('path');
const db = require("./db/producto");
const Transbank = require('transbank-sdk').WebpayPlus;
const Options = require('transbank-sdk').Options;
const IntegrationCommerceCodes = require('transbank-sdk').IntegrationCommerceCodes;
const Environment = require('transbank-sdk').Environment;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const apiKey = '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';
const commerceCode = '597055555532';

const transbank = new Transbank.Transaction(
    new Options(
        IntegrationCommerceCodes.WEBPAY_PLUS,
        apiKey,
        Environment.Integration
    )
);

app.get("/", async (req, res) => {
    try {
        const currentDate = new Date();
        const timeSeries = "F073.TCO.PRE.Z.D"
        const formattedDate = currentDate.toISOString().split('T')[0];
        const apiUrl = `https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx?user=ric.gonzalezf@duocuc.cl&pass=9598Vaba&timeseries=${timeSeries}&firstdate=${formattedDate}`;
        const response = await axios.get(apiUrl);
        const responseData = response.data;

        const productos = await db.getAllProducto();

        if (responseData.Codigo === 0 && responseData.Descripcion === "Success") {
            const seriesInfo = responseData.Series;
            const descripcion = seriesInfo.descripEsp;
            const valorTasaCambio = seriesInfo.Obs[0].value;
            const fecha = seriesInfo.Obs[0].indexDateString;

            res.render('index', { descripcion, valorTasaCambio, fecha, productos });
        } else {
            res.status(500).json({ error: 'Error al obtener datos de la API' });
        }
    } catch (error) {
        console.error('Error al obtener datos de la API:', error);
        res.status(500).json({ error: 'Error al obtener datos de la API' });
    }
});

app.post('/pagar', async (req, res) => {
    try {
        const ordenDeCompra = req.body.orden_de_compra; // Dinámico según el formulario
        const monto = req.body.monto; // Dinámico según el formulario

        const transaction = await transbank.create(ordenDeCompra, 'sesion_id', monto, 'http://localhost:1337/retorno');

        const form = `
            <html>
                <body>
                    <form id="webpay-form" action="${transaction.url}" method="post">
                        <input type="hidden" name="token_ws" value="${transaction.token}" />
                        <input type="submit" value="Ir a pagar" />
                    </form>
                    <script>
                        document.getElementById('webpay-form').submit();
                    </script>
                </body>
            </html>`;
        res.send(form);
    } catch (error) {
        console.error('Error al iniciar el pago:', error);
        res.status(500).send('Error al iniciar el pago');
    }
});

// Función para manejar la confirmación de la transacción
async function handleTransactionCommit(tokenWs, res) {
    if (!tokenWs) {
        return res.status(400).render('error', { error: "Token no proporcionado o inválido." });
    }
    
    try {
        const transaction = new Transbank.Transaction(
            new Options(
                IntegrationCommerceCodes.WEBPAY_PLUS,
                apiKey,
                Environment.Integration
            )
        );

        const response = await transaction.commit(tokenWs);

        if (response.status === "AUTHORIZED" && response.response_code === 0) {
            res.render('success', {
                amount: response.amount,
                buy_order: response.buy_order,
                authorization_code: response.authorization_code,
                transaction_date: response.transaction_date,
                payment_type_code: response.payment_type_code,
                installments_number: response.installments_number
            });
        } else {
            res.render('error', {
                error: "La transacción no fue autorizada o ha fallado",
                response_code: response.response_code
            });
        }
    } catch (error) {
        console.error('Error al confirmar la transacción:', error);
        res.status(500).render('error', { error: 'Error al procesar la transacción' });
    }
}

// Manejo de retorno de Transbank para método GET
app.get('/retorno', (req, res) => {
    const tokenWs = req.query.token_ws;  // Recibir el token desde la URL
    handleTransactionCommit(tokenWs, res);
});

// Manejo de retorno de Transbank para método POST
app.post('/retorno', (req, res) => {
    const tokenWs = req.body.token_ws;  // Recibir el token desde el cuerpo de la solicitud
    handleTransactionCommit(tokenWs, res);
});


app.listen(1337, () => console.log("El servidor está corriendo en http://localhost:1337'"));
