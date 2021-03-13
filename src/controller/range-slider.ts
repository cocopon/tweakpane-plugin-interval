import {Interval} from 'model/interval';
import {ValueController} from 'tweakpane/lib/plugin/common/controller/value';
import {Value} from 'tweakpane/lib/plugin/common/model/value';
import {mapRange} from 'tweakpane/lib/plugin/common/number-util';
import {
	PointerData,
	PointerHandler,
	PointerHandlerEvent,
} from 'tweakpane/lib/plugin/common/view/pointer-handler';

import {RangeSliderView} from '../view/range-slider';

interface Config {
	maxValue: number;
	minValue: number;
	value: Value<Interval>;
}

type Grabbing = 'min' | 'length' | 'max';

export class RangeSliderController implements ValueController<Interval> {
	public readonly value: Value<Interval>;
	public readonly view: RangeSliderView;
	private maxValue_: number;
	private minValue_: number;
	private grabbing_: Grabbing | null = null;
	private grabOffset_ = 0;

	constructor(doc: Document, config: Config) {
		this.onPointerDown_ = this.onPointerDown_.bind(this);
		this.onPointerMove_ = this.onPointerMove_.bind(this);
		this.onPointerUp_ = this.onPointerUp_.bind(this);

		this.maxValue_ = config.maxValue;
		this.minValue_ = config.minValue;

		this.value = config.value;
		this.view = new RangeSliderView(doc, {
			maxValue: config.maxValue,
			minValue: config.minValue,
			value: this.value,
		});

		const ptHandler = new PointerHandler(this.view.trackElement);
		ptHandler.emitter.on('down', this.onPointerDown_);
		ptHandler.emitter.on('move', this.onPointerMove_);
		ptHandler.emitter.on('up', this.onPointerUp_);
	}

	private ofs_(): number {
		if (this.grabbing_ === 'min') {
			return this.view.knobElements[0].getBoundingClientRect().width / 2;
		}
		if (this.grabbing_ === 'max') {
			return -this.view.knobElements[1].getBoundingClientRect().width / 2;
		}
		return 0;
	}

	private valueFromData_(data: PointerData): number | null {
		if (!data.point) {
			return null;
		}

		const p = (data.point.x + this.ofs_()) / data.bounds.width;
		return mapRange(p, 0, 1, this.minValue_, this.maxValue_);
	}

	private onPointerDown_(ev: PointerHandlerEvent) {
		if (!ev.data.point) {
			return;
		}

		const p = ev.data.point.x / ev.data.bounds.width;
		const v = this.value.rawValue;
		const pmin = mapRange(v.min, this.minValue_, this.maxValue_, 0, 1);
		const pmax = mapRange(v.max, this.minValue_, this.maxValue_, 0, 1);

		if (Math.abs(pmax - p) <= 0.025) {
			this.grabbing_ = 'max';
		} else if (Math.abs(pmin - p) <= 0.025) {
			this.grabbing_ = 'min';
		} else if (p >= pmin && p <= pmax) {
			this.grabbing_ = 'length';
			this.grabOffset_ = mapRange(
				p - pmin,
				0,
				1,
				this.minValue_,
				this.maxValue_,
			);
		} else if (p < pmin) {
			this.grabbing_ = 'min';
			this.onPointerMove_(ev);
		} else if (p > pmax) {
			this.grabbing_ = 'max';
			this.onPointerMove_(ev);
		}
	}

	private onPointerMove_(ev: PointerHandlerEvent) {
		const v = this.valueFromData_(ev.data);
		if (v === null) {
			return;
		}

		if (this.grabbing_ === 'min') {
			this.value.rawValue = new Interval(v, this.value.rawValue.max);
		} else if (this.grabbing_ === 'max') {
			this.value.rawValue = new Interval(this.value.rawValue.min, v);
		} else if (this.grabbing_ === 'length') {
			const len = this.value.rawValue.length;
			let min = v - this.grabOffset_;
			let max = min + len;
			if (min < this.minValue_) {
				min = this.minValue_;
				max = this.minValue_ + len;
			} else if (max > this.maxValue_) {
				min = this.maxValue_ - len;
				max = this.maxValue_;
			}
			this.value.rawValue = new Interval(min, max);
		}
	}

	private onPointerUp_(_ev: PointerHandlerEvent) {
		this.grabbing_ = null;
	}
}
