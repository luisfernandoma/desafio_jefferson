const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

// Marcas da Lenovo que queremos filtrar
const lenovoBrands = ['ThinkPad', 'Yoga', 'Legion', 'IdeaPad'];

// Função para verificar se o título contém alguma marca da Lenovo
function isLenovoProduct(Modelo) {
  return lenovoBrands.some(brand => Modelo.includes(brand));
}

// Função para extrair os detalhes da descrição e separá-los
function parseDescription(description) {
  const specs = description.split(',');
  const cleanSpecs = specs.map(spec => spec.trim());

  let Tela = '';
  let Processador = '';
  let Ram = '';
  let Armazenamento = '';
  let SO = '';
  let PlacaDeVideo = '';

  for (let spec of cleanSpecs) {
    if (/(\d+(\.\d+)?)\s*(\"|\s*inch)/i.test(spec)) {
      Tela = spec.replace(/\"|\s*inch/i, '').trim();
    } else if (/Core|Pentium|AMD|Ryzen/i.test(spec)) {
      Processador = spec.trim();
    } else if (/^\d{1,2}GB$/i.test(spec)) {
      Ram = spec.trim();
    } else if (/(\d{3,4}GB|TB|SSD|HDD)/i.test(spec)) {
      Armazenamento = spec.trim();
    } else if (/Windows|DOS|FreeDOS/i.test(spec)) {
      SO = spec.trim();
    } else if (/GTX|RTX|GeForce/i.test(spec)) {
      PlacaDeVideo = spec.trim();
    }
  }

  return {
    Modelo: cleanSpecs[0] || '',
    Tela,
    Processador,
    Ram,
    Armazenamento,
    SO,
    PlacaDeVideo
  };
}

// Função para buscar os dados de uma página específica
async function fetchProductData(page = 1) {
  const url = `https://webscraper.io/test-sites/e-commerce/static/computers/laptops?page=${page}`;

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const products = [];

    $('.col-md-4').each((index, element) => {
      const Modelo = $(element).find('.title').attr('title').trim();
      const Preco = $(element).find('.price').text().trim();
      const description = $(element).find('.description').text().trim();

      if (isLenovoProduct(Modelo)) {
        let product = parseDescription(description);
        product.Modelo = Modelo;
        product.Preco = Preco;

        // Remover campos vazios
        product = Object.fromEntries(
          Object.entries(product).filter(([_, value]) => value !== '')
        );

        products.push(product);
      }
    });

    return products;
  } catch (error) {
    console.error(`Erro ao obter dados da página ${page}:`, error);
    return [];
  }
}


// Função para coletar os dados de todas as páginas
async function fetchAllProductData() {
  let allProducts = [];
  const firstPageUrl = 'https://webscraper.io/test-sites/e-commerce/static/computers/laptops?page=1';

  try {
    const { data } = await axios.get(firstPageUrl);
    const $ = cheerio.load(data);

    const lastPageNumber = parseInt($('.page-item').last().prev().text());

    for (let page = 1; page <= lastPageNumber; page++) {
      console.log(`Coletando dados da página ${page}...`);
      const products = await fetchProductData(page);
      allProducts = [...allProducts, ...products];
    }

    // Ordenar os produtos do mais barato para o mais caro
    allProducts.sort((a, b) => {
      const priceA = parseFloat(a.Preco.replace(/[^0-9.]/g, '')); // Remove símbolos e converte para número
      const priceB = parseFloat(b.Preco.replace(/[^0-9.]/g, ''));
      return priceA - priceB;
    });

    return allProducts;
  } catch (error) {
    console.error('Erro ao obter o número de páginas:', error);
    return [];
  }
}


// Rota para buscar dados dos produtos
app.get('/api/products', async (req, res) => {
  try {
    const products = await fetchAllProductData();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao coletar os dados' });
  }
});

// Iniciando o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
