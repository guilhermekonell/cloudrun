const express = require('express');
const download = require('download-git-repo');
const { promisify } = require('util');
const { uuid } = require('uuidv4');
const rimraf = require('rimraf');
const fs = require('fs').promises;
const { runCLI } = require('jest');
const { exec } = require('child_process');

const app = express()

const runCommand = promisify(exec);
const downloadRepo = promisify(download);
const deleteFolder = promisify(rimraf);

app.get('/', async (req, res) => {
  const uniqueID = uuid();

  // Baixando os repositórios:
  // - O projeto template que contém a estrutura base da aplicação 
  //    com os testes para validação
  // - E o projeto desenvolvido pelo aluno que contém a implementação 
  //    a fim fazer com que os testes passem com sucesso
  await Promise.all([
    downloadRepo('github:guilhermekonell/challenge-template', `./tmp/template-${uniqueID}`),
    downloadRepo('github:guilhermekonell/challenge-template-dev', `./tmp/code-${uniqueID}`),
  ]);

  // Deletamos a pasta de testes e configurações do projeto do aluno
  await Promise.all([
    deleteFolder(`./tmp/code-${uniqueID}/__tests__`),
    fs.unlink(`./tmp/code-${uniqueID}/jest.config.js`),
  ]);

  // Copiamos a pasta de testes e configurações do projeto template 
  //  para o projeto do aluno
  // Isso garante que o aluno não tenha alterado os testes a fim de "burlar" 
  //  a correção
  await Promise.all([
    fs.rename(
      `./tmp/template-${uniqueID}/__tests__`,
      `./tmp/code-${uniqueID}/__tests__`,
    ),
    fs.rename(
      `./tmp/template-${uniqueID}/jest.config.js`,
      `./tmp/code-${uniqueID}/jest.config.js`,
    ),
  ]);

  // Deletamos o projeto template pois não é mais necessário
  await deleteFolder(`./tmp/template-${uniqueID}`);

  // Instalamos as dependências do projeto
  await runCommand(`cd ./tmp/code-${uniqueID} && npm install`);

  // Rodamos os testes
  const result = await runCLI({
    json: true,
    silent: true,
    reporters: [],
  }, [`./tmp/code-${uniqueID}`]);

  // Deletamos o projeto do aluno
  await deleteFolder(`./tmp/code-${uniqueID}`);

  // Retonamos o resultado dos testes em um JSON
  return res.json(result.results);
});

const port = process.env.PORT || 8080;

app.listen(port, () => { 
  console.log('Hello world listening on port ', port)
});