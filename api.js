const express = require('express');
const app = express();
const port = 3000;

// Endpoint para buscar os dados dos produtos
app.get('/api/products', async (req, res) => {
  try {
    const products = await fetchProductData();
    res.json(products); // Retorna os dados dos produtos em formato JSON
  } catch (error) {
    res.status(500).json({ error: 'Erro ao coletar os dados' });
  }
});

// Inicializando o servidor Express
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
