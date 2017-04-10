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
- __swagger__: flag for using swagger docs

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