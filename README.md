# md-docs-express
md document router on express

## Usage

```node
var option = {
    mddir: require('path').join(__dirname, 'mddir'),
};

app.use('/docs', require('md-docs-express')(option));
```

## API

### md-docs-express(options)

#### returns

- express router

#### options

- __mddir__: Directory includes md files
- __hasSetting__: if true, read \<mddir\>/settings.json for various setting like listing order
- __debug__: debug flag
- __title__: page title
- __swaggerDoc__: swagger document (json format)

## settings.json

If there are 3 files[A.md, B.md, C.md] are in mddir, you can set their order as following

```json
{
    "listorder": [
        "C",
        "A",
        "B"
    ]
}
```

## ETC

- support sub-directories are not supported yet...

## Demo

1. create directories

```bash
mkdir mytest
cd mytest
mkdir documents
```

2. create example md files

```bash
vi documents/A.md
vi documents/B.md
vi documents/C.md
```

3. Create express project

```bash
npm install express -g
express -e ./
npm install
npm install --save md-docs-express
```

4. add page to app.js

```node
app.use('/docs', require('md-docs-express')({
    mddir: require('path').join(__dirname, 'documents'),
    title: 'Hello World!'
}));
```

5. Start app

```bash
node bin/www
```

6. Look your page

<http://localhost:8080/docs>

![picture1](/capture1.PNG)

![picture2](/capture2.PNG)