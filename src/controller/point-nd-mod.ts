import {Constraint} from 'tweakpane/lib/plugin/common/constraint/constraint';
import {ValueController} from 'tweakpane/lib/plugin/common/controller/value';
import {Formatter} from 'tweakpane/lib/plugin/common/converter/formatter';
import {Parser} from 'tweakpane/lib/plugin/common/converter/parser';
import {Value} from 'tweakpane/lib/plugin/common/model/value';
import {PointNdConstraint} from 'tweakpane/lib/plugin/input-bindings/common/constraint/point-nd';
import {PointNdAssembly} from 'tweakpane/lib/plugin/input-bindings/common/model/point-nd';
import {PointNdTextView} from 'tweakpane/lib/plugin/input-bindings/common/view/point-nd-text';
import {NumberTextController} from 'tweakpane/lib/plugin/input-bindings/number/controller/number-text';

import {connectValuesMod} from './value-sync-mod';

interface Axis {
	baseStep: number;
	draggingScale: number;
	formatter: Formatter<number>;
}

interface Config<PointNd> {
	assembly: PointNdAssembly<PointNd>;
	axes: Axis[];
	parser: Parser<number>;
	value: Value<PointNd>;
}

function findAxisConstraint<PointNd>(
	config: Config<PointNd>,
	index: number,
): Constraint<number> | undefined {
	const pc = config.value.constraint;
	if (!(pc instanceof PointNdConstraint)) {
		return undefined;
	}
	return pc.components[index];
}

function createAxisController<PointNd>(
	doc: Document,
	config: Config<PointNd>,
	index: number,
): NumberTextController {
	return new NumberTextController(doc, {
		arrayPosition:
			index === 0 ? 'fst' : index === config.axes.length - 1 ? 'lst' : 'mid',
		baseStep: config.axes[index].baseStep,
		formatter: config.axes[index].formatter,
		draggingScale: config.axes[index].draggingScale,
		parser: config.parser,
		value: new Value(0, {
			constraint: findAxisConstraint(config, index),
		}),
	});
}

// TODO: Apply changes to core
export class PointNdTextControllerMod<PointNd>
	implements ValueController<PointNd> {
	public readonly value: Value<PointNd>;
	public readonly view: PointNdTextView<PointNd>;
	private readonly acs_: NumberTextController[];

	constructor(doc: Document, config: Config<PointNd>) {
		this.value = config.value;

		this.acs_ = config.axes.map((_, index) =>
			createAxisController(doc, config, index),
		);
		this.acs_.forEach((c, index) => {
			connectValuesMod({
				preventsFeedback: false,
				primary: this.value,
				secondary: c.value,
				forward: (p) => {
					return config.assembly.toComponents(p.rawValue)[index];
				},
				backward: (p, s) => {
					const comps = config.assembly.toComponents(p.rawValue);
					comps[index] = s.rawValue;
					return config.assembly.fromComponents(comps);
				},
			});
		});

		this.view = new PointNdTextView(doc, {
			textViews: this.acs_.map((ac) => ac.view),
			value: this.value,
		});
	}
}
