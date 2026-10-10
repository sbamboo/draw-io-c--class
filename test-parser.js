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
	'  protected void Hide() {}',
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
assert.strictEqual(shape[0].operations[2].text, '# Hide(): void');

var iface = parseDocument('interface IFoo <<service>>\nvoid Run(int x, Dictionary<string, int> map)');
assert.deepStrictEqual(iface[0].stereotypes, ['interface', 'service']);
assert.strictEqual(iface[0].italic, true);
assert.strictEqual(iface[0].operations[0].text, '+ Run(x: int, map: Dictionary&lt;string, int&gt;): void');

var enumerated = parseDocument('enum Color <<flags>>\nRed\nGreen');
assert.deepStrictEqual(enumerated[0].stereotypes, ['enum', 'flags']);
assert.strictEqual(enumerated[0].italic, false);
assert.deepStrictEqual(enumerated[0].attributes.map(function (m) { return m.text; }), ['Red', 'Green']);
assert.deepStrictEqual(enumerated[0].operations, []);

var markedEnum = parseDocument('enum Access\npublic Read\nprivate Write');
assert.deepStrictEqual(markedEnum[0].attributes.map(function (m) { return m.text; }), ['Read', 'Write']);

var structured = parseDocument('public struct Point <<value>>\npublic int X\nprivate int Y\nprotected void Shift()');
assert.deepStrictEqual(structured[0].stereotypes, ['struct', 'value']);
assert.strictEqual(structured[0].italic, false);
assert.deepStrictEqual(structured[0].attributes.map(function (m) { return m.text; }), ['+ X: int', '- Y: int']);
assert.strictEqual(structured[0].operations[0].text, '# Shift(): void');

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

var initial = parseDocument('class State\npublic bool Dead = false\npublic string Name = "a = b"\nenum Code\nRed = 1');
assert.strictEqual(initial[0].attributes[0].text, '+ Dead: bool = false');
assert.strictEqual(initial[0].attributes[1].text, '+ Name: string = "a = b"');
assert.strictEqual(initial[1].attributes[0].text, 'Red = 1');

var noted = parseDocument([
	'class Box',
	'public int Width { get; set; } // wide',
	'public int Height => 1 // tall',
	'public int Depth { get => _d; } // only getter',
	'public int Area { get => _a; set => _a = value; }',
	'private void Reset() // clears',
	'enum Color',
	'Red // primary',
	'Green'
].join('\n'));

assert.strictEqual(noted[0].attributes[0].text, '+ Width: int <font color="#008000">// wide</font>');
assert.strictEqual(noted[0].attributes[1].text, '+ Height: int {readOnly} <font color="#008000">// tall</font>');
assert.strictEqual(noted[0].attributes[2].text, '+ Depth: int {readOnly} <font color="#008000">// only getter</font>');
assert.strictEqual(noted[0].attributes[3].text, '+ Area: int');
assert.strictEqual(noted[0].operations[0].text, '- Reset(): void <font color="#008000">// clears</font>');
var derived = parseDocument('class MyClass : ParentClass, IExampleInterface <<entity>>\ninterface IExampleInterface : IOther\nclass Bag<T> : Collection<T>');
assert.deepStrictEqual(derived[0].bases, ['ParentClass', 'IExampleInterface']);
assert.deepStrictEqual(derived[0].stereotypes, ['entity']);
assert.deepStrictEqual(derived[1].bases, ['IOther']);
assert.deepStrictEqual(derived[2].bases, ['Collection<T>']);

var linked = parseDocument([
	'class Car',
	'public Engine Motor',
	'public Engine[] Motors',
	'public Engine? Spare',
	'public List<Wheel> Wheels §agg:Wheel',
	'public string Name = "§comp:Fake"',
	'public void Drive(Road road) §assoc:Logger',
	'public Owner Portal §Owner',
	'public Part Chassis §composition:Part',
	'public Hub Nab §comp:Hub',
	'public Seat Place § association : Seat',
	'public Ns.Clip Pin §aggregation:Ns.Clip'
].join('\n'));

function refText(member) {
	return (member.refs || []).map(function (ref) {
		return (ref.explicit ? ref.kind + '!' : ref.kind) + ':' + ref.name;
	}).join(',');
}

assert.strictEqual(linked[0].attributes[0].text, '+ Motor: Engine');
assert.strictEqual(refText(linked[0].attributes[0]), 'composition:Engine');
assert.strictEqual(refText(linked[0].attributes[1]), 'composition:Engine');
assert.strictEqual(refText(linked[0].attributes[2]), 'composition:Engine');
assert.strictEqual(linked[0].attributes[3].text, '+ Wheels: List&lt;Wheel&gt;');
assert.strictEqual(refText(linked[0].attributes[3]), 'composition:List,aggregation!:Wheel');
assert.strictEqual(linked[0].attributes[4].text, '+ Name: string = "§comp:Fake"');
assert.strictEqual(refText(linked[0].attributes[4]), '');
assert.strictEqual(linked[0].operations[0].text, '+ Drive(road: Road): void');
assert.strictEqual(refText(linked[0].operations[0]), 'association:Road,association!:Logger');
assert.strictEqual(refText(linked[0].attributes[5]), 'association!:Owner');
assert.strictEqual(refText(linked[0].attributes[6]), 'composition!:Part');
assert.strictEqual(refText(linked[0].attributes[7]), 'composition!:Hub');
assert.strictEqual(refText(linked[0].attributes[8]), 'association!:Seat');
assert.strictEqual(refText(linked[0].attributes[9]), 'aggregation!:Ns.Clip');
assert.ok(linked[0].attributes.filter(function (member, index) { return index !== 4; }).map(function (member) { return member.text; }).join(' ').indexOf('§') < 0);

var mixed = parseDocument([
	'class Sample',
	'private string thing; {showThis1} {showThis2} §assoc:OtherThing // Comment',
	'private string noted // §thing',
	'// §thing',
	'public Engine Motor {part} §comp:Engine // drives',
	'public void Run(Road road) {async}; §agg:Road // §comp:Hidden'
].join('\n'));

assert.strictEqual(mixed[0].attributes.length, 3);
assert.strictEqual(mixed[0].operations.length, 1);
assert.strictEqual(
	mixed[0].attributes[0].text,
	'- thing: string {showThis1}{showThis2} <font color="#008000">// Comment</font>'
);
assert.strictEqual(refText(mixed[0].attributes[0]), 'association!:OtherThing');
assert.strictEqual(
	mixed[0].attributes[1].text,
	'- noted: string <font color="#008000">// §thing</font>'
);
assert.strictEqual(refText(mixed[0].attributes[1]), '');
assert.strictEqual(
	mixed[0].attributes[2].text,
	'+ Motor: Engine {part} <font color="#008000">// drives</font>'
);
assert.strictEqual(refText(mixed[0].attributes[2]), 'composition!:Engine');
assert.strictEqual(
	mixed[0].operations[0].text,
	'+ Run(road: Road): void {async} <font color="#008000">// §comp:Hidden</font>'
);
assert.strictEqual(refText(mixed[0].operations[0]), 'aggregation!:Road');

var hinted = parseDocument([
	'class Box',
	'private OtherClass thing §assoc',
	'private OtherClass linked §association',
	'private OtherClass part §agg',
	'private OtherClass group §aggregation',
	'private OtherClass whole §comp',
	'private OtherClass owned §composition',
	'public List<Wheel> Wheels §agg',
	'public List<Wheel> Mixed §assoc §agg:Wheel',
	'private string name §assoc',
	'private OtherClass noted {part} §assoc // kept',
	'public OtherClass Get() §assoc',
	'// §assoc'
].join('\n'));

assert.strictEqual(hinted[0].attributes[0].text, '- thing: OtherClass');
assert.strictEqual(refText(hinted[0].attributes[0]), 'association!:OtherClass');
assert.strictEqual(refText(hinted[0].attributes[1]), 'association!:OtherClass');
assert.strictEqual(refText(hinted[0].attributes[2]), 'aggregation!:OtherClass');
assert.strictEqual(refText(hinted[0].attributes[3]), 'aggregation!:OtherClass');
assert.strictEqual(refText(hinted[0].attributes[4]), 'composition!:OtherClass');
assert.strictEqual(refText(hinted[0].attributes[5]), 'composition!:OtherClass');
assert.strictEqual(refText(hinted[0].attributes[6]), 'aggregation!:List,aggregation!:Wheel');
assert.strictEqual(refText(hinted[0].attributes[7]), 'association!:List,aggregation!:Wheel');
assert.strictEqual(hinted[0].attributes[8].text, '- name: string');
assert.strictEqual(refText(hinted[0].attributes[8]), '');
assert.strictEqual(
	hinted[0].attributes[9].text,
	'- noted: OtherClass {part} <font color="#008000">// kept</font>'
);
assert.strictEqual(refText(hinted[0].attributes[9]), 'association!:OtherClass');
assert.strictEqual(hinted[0].operations[0].text, '+ Get(): OtherClass');
assert.strictEqual(refText(hinted[0].operations[0]), 'association!:OtherClass');
assert.ok(hinted[0].attributes.concat(hinted[0].operations).map(function (member) {
	return member.text;
}).join(' ').indexOf('§') < 0);

var bodies = parseDocument([
	'class Widget {',
	'public void Run() {',
	'  var x = 1;',
	'  if (x > 0) {',
	'    Go(x);',
	'  }',
	'  return;',
	'}',
	'public int Width {',
	'  get { return _w; }',
	'  set { _w = value; }',
	'}',
	'public int Height',
	'{',
	'  get { return _h; }',
	'}',
	'public void Stop()',
	'{',
	'  var done = "a { b }";',
	'}',
	'public string Name { get; set; }',
	'private void Once() { Kick(); }',
	'public int Area { get { return _a; } }',
	'public void Talk() {',
	'  var s = "a { b }";',
	'}',
	'public int After;',
	'}'
].join('\n'));

assert.deepStrictEqual(bodies[0].operations.map(function (member) { return member.text; }), [
	'+ Run(): void',
	'+ Stop(): void',
	'- Once(): void',
	'+ Talk(): void'
]);
assert.deepStrictEqual(bodies[0].attributes.map(function (member) { return member.text; }), [
	'+ Width: int',
	'+ Height: int {readOnly}',
	'+ Name: string',
	'+ Area: int {readOnly}',
	'+ After: int'
]);

var uses = parseDocument([
	'class Shop',
	'public Engine Motor',
	'public void Drive(Road road) {',
	'  var log = new Logger();',
	'  road.Go();',
	'  var spare = new Engine();',
	'  Wheel w = new Wheel();',
	'}',
	'public void Paint(Color color) { new Logger(); }',
	'class Gate',
	'public Road Lane',
	'public void Enter(Road road) {',
	'  new Logger();',
	'  new Road();',
	'}'
].join('\n'));

assert.strictEqual(refText(uses[0].attributes[0]), 'composition:Engine');
assert.strictEqual(refText(uses[0].operations[0]), 'association:Road,usage:Logger,usage:Wheel');
assert.strictEqual(refText(uses[0].operations[1]), 'association:Color,usage:Logger');
assert.strictEqual(refText(uses[1].attributes[0]), 'composition:Road');
assert.strictEqual(refText(uses[1].operations[0]), 'usage:Logger');

assert.strictEqual(noted[1].attributes[0].text, 'Red <font color="#008000">// primary</font>');
assert.deepStrictEqual(noted[1].operations, []);

console.log('parser ok');
