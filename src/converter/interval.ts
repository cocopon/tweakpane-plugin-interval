import {BindingTarget} from 'tweakpane/lib/common/binding/target';

import {Interval} from '../model/interval';

export function intervalFromUnknown(value: unknown): Interval {
	return Interval.isObject(value)
		? new Interval(value.min, value.max)
		: new Interval(0, 0);
}

export function writeInterval(target: BindingTarget, value: Interval): void {
	target.writeProperty('max', value.max);
	target.writeProperty('min', value.min);
}
