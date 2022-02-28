class Vector{
	constructor(x, y){
		this.x = x;
		this.y = y;
	}
	static fromPolar(r, phi){
		return new Vector(
			r * Math.cos(phi),
			r * Math.sin(phi)
		);
	}
	add(oVec){
		return new Vector(
			this.x + oVec.x,
			this.y + oVec.y
		);
	}
	subtract(oVec){
		return new Vector(
			this.x - oVec.x,
			this.y - oVec.y
		);
	}
	multiply(scale){
		return new Vector(
			this.x * scale,
			this.y * scale
		);
	}
	divide(scale){
		return new Vector(
			this.x / scale,
			this.y / scale
		);
	}
	equals(oVec){
		return (
			this.x == oVec.x &&
			this.y == oVec.y
		);
	}
	floor(){
		return new Vector(
			Math.floor(this.x),
			Math.floor(this.y)
		);
	}
	dot(oVec){
		return this.x * oVec.x + this.y * oVec.y;
	}
	getLength(){
		return Math.sqrt(this.dot(this));
	}
	getAngle(){
		return Math.atan2(this.y, this.x);
	}
	toArray(){
		return [this.x, this.y];
	}
};

class Dimensions{
	constructor(width, height){
		this.width = width;
		this.height = height;
	}
	contains(pos){
		return pos.x >= 0 && pos.y >= 0 &&
			pos.x < this.width && pos.y < this.height;
	}
	getArea(){
		return this.width * this.height;
	}
	equals(oDims){
		return this.width == oDims.width && this.height == oDims.height;
	}
	toArray(){
		return [this.width, this.height];
	}
};

class Rect{
	constructor(pos, dims){
		this.pos = pos;
		this.dims = dims;
	}
	get x(){
		return this.pos.x;
	}
	get y(){
		return this.pos.y;
	}
	get width(){
		return this.dims.width;
	}
	get height(){
		return this.dims.height;
	}
	get left(){
		return this.pos.x;
	}
	get right(){
		return this.pos.x + this.dims.width;
	}
	get top(){
		return this.pos.y;
	}
	get bottom(){
		return this.pos.y + this.dims.height;
	}
	contains(pos){
		return this.dims.contains(pos.subtract(this.pos));
	}
	static fromBounds(left, right, top, bottom){
		return new Rect(
			new Vector(left, top),
			new Dimensions(right - left, bottom - top)
		);
	}
};

class MouseButton{
};
MouseButton.MOUSE_LEFT = 0;
MouseButton.MOUSE_MIDDLE = 1;
MouseButton.MOUSE_RIGHT = 2;

class Utils{
	static isPointInRect(p, rect){
		return p.x >= rect.left && p.x < rect.right &&
			   p.y >= rect.top && p.y < rect.bottom;
	}
	static clamp(num, min, max){
		return (num <= min) ? min : ((num >= max) ? max : num);
	}
	static padStr(str, targetLen, padChar = '0'){
		let res = '';
		for(let i = 0; i < targetLen - str.length; i++)
			res += padChar;
		res += str;
		return res;
	}
	static randInt(max) {
		return Math.floor(Math.random() * max);
	}
	static lowerBound(arr, val) {
		let lower = 0, upper = arr.length;
		while (lower < upper) {
			const mid = Math.floor((lower + upper) / 2);
			if (arr[mid] < val)
				lower = mid + 1;
			else
				upper = mid;
		}
		if (lower != upper)
			throw new Error(`binary search bug: ${lower} != ${upper}`);
		return lower;
	}
	static upperBound(arr, val) {
		let lower = 0, upper = arr.length;
		while (lower < upper) {
			const mid = Math.floor((lower + upper) / 2);
			if (arr[mid] <= val)
				lower = mid + 1;
			else
				upper = mid;
		}
		if (lower != upper)
			throw new Error(`binary search bug: ${lower} != ${upper}`);
		return lower;
	}
};
Utils.DIRS4 = [
	new Vector(1, 0),
	new Vector(0, 1),
	new Vector(-1, 0),
	new Vector(0, -1)
];

module.exports = {
	Vector: Vector,
	Dimensions: Dimensions,
	Rect: Rect,
	MouseButton: MouseButton,
	Utils: Utils
};
