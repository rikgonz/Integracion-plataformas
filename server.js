const express = require("express");
const app = express();
const axios = require("axios");
const bodyParser = require('body-parser');
const path = require('path');
const db = require("./db/producto");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'ejs'); // Establecer el motor de vistas como EJS
app.set('views', path.join(__dirname, 'views')); // Establecer la ubicación de las vistas

// Ruta raíz para obtener los datos de la API externa
app.get("/", async (req, res) => {
    try {
        // Obtener la fecha actual
        const currentDate = new Date();

        //Seleccionar Time Series
        // Dolar a Pesos: "F073.TCO.PRE.Z.D
        const timeSeries= "F073.TCO.PRE.Z.D"

        // Formatear la fecha en el formato necesario (YYYY-MM-DD)
        const formattedDate = currentDate.toISOString().split('T')[0];

        // Construir la URL de la API con la fecha actual
        const apiUrl = `https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx?user=ric.gonzalezf@duocuc.cl&pass=9598Vaba&timeseries=${timeSeries}&firstdate=${formattedDate}`;

        // Realizar la solicitud a la API
        const response = await axios.get(apiUrl);
        const responseData = response.data;

        const productos = await db.getAllProducto();

        // Comprobamos si la solicitud fue exitosa
        if (responseData.Codigo === 0 && responseData.Descripcion === "Success") {
            const seriesInfo = responseData.Series;
            const descripcion = seriesInfo.descripEsp;
            const valorTasaCambio = seriesInfo.Obs[0].value;
            const fecha = seriesInfo.Obs[0].indexDateString;

            // Renderizamos la vista index.ejs y pasamos los datos como contexto
            res.render('index', { descripcion, valorTasaCambio, fecha, productos });
        } else {
            // Si la solicitud no fue exitosa, manejamos el error
            res.status(500).json({ error: 'Error al obtener datos de la API' });
        }
    } catch (error) {
        console.error('Error al obtener datos de la API:', error);
        res.status(500).json({ error: 'Error al obtener datos de la API' });
    }
});

// Rutas para manejar productos
app.post("/producto", async (req,res) => {
    const results = await db.createProducto(req.body);
    res.status(201).json({ id: results[0] });
});

app.get("/producto", async (req,res) =>{
    const producto = await db.getAllProducto();
    res.status(200).json({producto});
});

app.get("/producto/:id", async (req, res) => {
    const id = req.params.id;
    const producto = await db.getProductoById(id);
    
    if (producto) {
        res.status(200).json({ producto });
    } else {
        res.status(404).json({ error: "Producto no encontrado" });
    }
});

app.patch("/producto/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const productoActualizado = await db.updateProducto(id, req.body);
        res.status(200).json({ id: productoActualizado.id });
    } catch (error) {
        console.error('Error al actualizar el producto:', error);
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
});

app.delete("/producto/:id", async (req, res) => {
    await db.deleteProducto(req.params.id);
    res.status(200).json({ sucess: true })
});

app.get("/test", (req, res) => {
    res.status(200).json({ sucess: true });
});

app.listen(1337, () => console.log("El servidor está corriendo en http://localhost:1337'"));
