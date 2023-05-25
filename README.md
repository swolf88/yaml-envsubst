# yaml-envsubst
envsubst tool for yaml files (especially for kubernetes yaml files)

This tool is created in order to substitute envrionment varibales inside the Kubernetes yaml templates during the Gitlab CI job execution. 

You can have two variants:
1. Substitute values or part of values.
```yaml
test: ${MYVAR}
test2: ${MYVAR}-some text
test3: ${MULTILINE_VAR}
```

in case if you set your environment like that:
```bash
export MYVAR=First value
export MULTILINE_VAR="First line
second line"
```

You will get this yaml as an output:
```yaml
test: First value
test2: First value-some text
test3: |-
       First line
       second line
```

2. Substitute complete key:
```yaml
${test}:
    innerKey: value
anotherKey: value
```
so you can define the env variables test as:
```yaml
key1: 
    otherKey: value
    otherKey2: value
```

as aa result you will get:
```yaml
key1: 
    otherKey: value
    otherKey2: value
    innerKey: value
anotherKey: value
```

A variable value may contain another variable, which is also supported.

## Installation
```bash
npm install -g @dsolodky/yaml-envsubst
```

You will probably want to add it to you docker file. 
```dockerfile
RUN apk add --update npm
RUN npm install -g @dsolodky/yaml-envsubst

```

## Usage
The tool expects two command line arguments
```bash
yaml-envsubst ./kubernetes-template.yaml ./kubernetes.yaml
```
