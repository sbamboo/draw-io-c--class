var assert = require('assert');
var parseDocument = require('./csharp-uml.js').parseDocument;

var sample = parseDocument([
	'class MYClass {',
	'    private memberVar;',
	'    public Property => true',
	'    private void MemberMethod(string param) {}',
	'    public void MemberMethodPubl(string param) {}',
	'}'
].join('\n'));

assert.strictEqual(sample.length, 1);
assert.strictEqual(sample[0].name, 'MYClass');
assert.strictEqual(sample[0].italic, false);
assert.deepStrictEqual(sample[0].stereotypes, []);
assert.deepStrictEqual(sample[0].attributes.map(function (m) { return m.text; }), [
	'- memberVar',
	'+ Property {readOnly}'
]);
assert.deepStrictEqual(sample[0].operations.map(function (m) { return m.text; }), [
	'- MemberMethod(param: string): void',
	'+ MemberMethodPubl(param: string): void'
]);

var loose = parseDocument('class Box\npublic int Width {readOnly}\nprivate static void Reset()');
assert.strictEqual(loose[0].attributes[0].text, '+ Width: int {readOnly}');
assert.strictEqual(loose[0].operations[0].text, '- Reset(): void {static}');
assert.strictEqual(loose[0].operations[0].fontStyle, 4);

var shape = parseDocument([
	'abstract class Shape <<entity>> {',
	'  public abstract void Draw();',
	'  public static int Count { get; }',
	'  public Shape(string name) {}',
	'  protected internal string Id { get; set; }',
	'}'
].join('\n'));

assert.deepStrictEqual(shape[0].stereotypes, ['abstract', 'entity']);
assert.strictEqual(shape[0].italic, true);
assert.strictEqual(shape[0].operations[0].text, '+ Draw(): void {abstract}');
assert.strictEqual(shape[0].operations[0].fontStyle, 2);
assert.strictEqual(shape[0].attributes[0].text, '+ Count: int {readOnly}{static}');
assert.strictEqual(shape[0].attributes[0].fontStyle, 4);
assert.strictEqual(shape[0].operations[1].text, '+ &lt;&lt;constructor&gt;&gt;(name: string)');
assert.strictEqual(shape[0].attributes[1].text, '# Id: string');

var iface = parseDocument('interface IFoo <<service>>\nvoid Run(int x, Dictionary<string, int> map)');
assert.deepStrictEqual(iface[0].stereotypes, ['interface', 'service']);
assert.strictEqual(iface[0].italic, true);
assert.strictEqual(iface[0].operations[0].text, '+ Run(x: int, map: Dictionary&lt;string, int&gt;): void');

var enumerated = parseDocument('enum Color <<flags>>\nRed\nGreen');
assert.deepStrictEqual(enumerated[0].stereotypes, ['enum', 'flags']);
assert.strictEqual(enumerated[0].italic, false);
assert.deepStrictEqual(enumerated[0].attributes.map(function (m) { return m.text; }), ['+ Red', '+ Green']);

var marked = parseDocument('class Token <<abstract>> <<enum>>');
assert.deepStrictEqual(marked[0].stereotypes, ['abstract', 'enum']);
assert.strictEqual(marked[0].italic, true);

var both = parseDocument('public static abstract void Foo()\nclass Holder\npublic static abstract void Foo()');
assert.strictEqual(both[0].operations[0].text, '+ Foo(): void {static}{abstract}');
assert.strictEqual(both[0].operations[0].fontStyle, 6);

var generic = parseDocument('class Bag<T>\npublic Bag(T item)\npublic List<T> Item { get; private set; }');
assert.strictEqual(generic[0].name, 'Bag<T>');
assert.strictEqual(generic[0].operations[0].text, '+ &lt;&lt;constructor&gt;&gt;(item: T)');
assert.strictEqual(generic[0].attributes[0].text, '+ Item: List&lt;T&gt;');

console.log('parser ok');
