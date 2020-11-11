/** @format */

import React, { Component } from 'react';
import cjs, { Chart } from 'chart.js';
import * as dragData from 'chartjs-plugin-dragdata';
import { buildDataSet, createChart } from './FanCurve/options';
import { Button, Input, Modal, PageHeader } from 'antd';
import ArmoryPlanSettings from './ArmoryPlan';
import { store, updateFanConfig } from '../../Store/ReduxStore';
import Select from './Select';
interface Props {}

interface State {
	chart: cjs | undefined;
	currentCurves: {
		cpu: Array<number>;
		gpu: Array<number>;
	};
	fanCurves: Array<FanCurveConfig>;
	charts: {
		cpu: Chart | undefined;
		gpu: Chart | undefined;
	};
	plan: ArmoryPlan;
	modalVisible: boolean;
	modalLoading: boolean;
	newName: string;
}

export default class FanCurve extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		let currentState = store.getState() as G14Config;
		let { cpu, gpu, plan } = currentState.fanCurves[0];
		this.state = {
			chart: undefined,
			currentCurves: {
				cpu: [...cpu],
				gpu: [...gpu],
			},
			charts: {
				cpu: undefined,
				gpu: undefined,
			},
			fanCurves: currentState.fanCurves,
			plan: plan,
			modalVisible: false,
			modalLoading: false,
			newName: '',
		};
	}

	savePlan = () => {
		let { currentCurves, plan, fanCurves, newName } = this.state;
		let { cpu, gpu } = currentCurves;
		let newFanConfigOption: FanCurveConfig = {
			name: newName,
			cpu: cpu,
			gpu: gpu,
			plan: plan,
		};
		let newFanCurves = [...fanCurves, newFanConfigOption];
		store.dispatch(updateFanConfig(newFanCurves));
		this.setState({
			fanCurves: newFanCurves,
			newName: '',
			modalLoading: false,
			modalVisible: false,
		});
	};

	selectPlan = (plan: ArmoryPlan) => {
		this.setState({ plan });
	};

	handleMapModify = (key: string, index: number, value: number) => {
		if (key === 'fanCurveChartCPU') {
			let { gpu, cpu } = this.state.currentCurves;
			this.setState({
				currentCurves: {
					cpu: cpu.map((val, idx) => {
						return idx === index ? value : val;
					}),
					gpu,
				},
			});
		} else if (key === 'fanCurveChartGPU') {
			let { gpu, cpu } = this.state.currentCurves;
			this.setState({
				currentCurves: {
					cpu,
					gpu: gpu.map((val, idx) => {
						return idx === index ? value : val;
					}),
				},
			});
		}
	};

	handleSubmitCurves = async (e: any) => {
		let result = await window.ipcRenderer.invoke(
			'setFanCurve',
			this.state.currentCurves
		);
	};

	componentDidMount() {
		//Testing fan curve data
		let { cpu, gpu } = this.state.currentCurves;
		Chart.pluginService.register(dragData);
		let cpuChart = createChart('fanCurveChartCPU', this.handleMapModify, cpu);
		let gpuChart = createChart('fanCurveChartGPU', this.handleMapModify, gpu);
		this.setState({
			charts: {
				cpu: cpuChart,
				gpu: gpuChart,
			},
		});
	}

	componentWillUnmount() {
		Chart.pluginService.unregister(dragData);
	}

	chooseFanCurveThing = (name: string) => {
		let { fanCurves, charts } = this.state;
		let chosen = fanCurves.find((curve) => {
			return curve.name === name;
		});

		if (chosen && charts.cpu && charts.gpu) {
			let { cpu, gpu } = chosen;
			let cpuc = buildDataSet([...cpu], 'fanCurveChartCPU');
			let gpuc = buildDataSet([...gpu], 'fanCurveChartGPU');
			//@ts-ignore
			charts.cpu.config.data.datasets = cpuc;
			//@ts-ignore
			charts.gpu.config.data.datasets = gpuc;
			charts.cpu.update();
			charts.gpu.update();
			this.setState({
				currentCurves: { cpu: [...cpu], gpu: [...gpu] },
			});
		}
	};

	handleModalOk = () => {
		this.setState({ modalLoading: true }, () => {
			this.savePlan();
		});
	};

	handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ newName: e.target.value });
	};

	handleModalCancel = () => {
		this.setState({ modalVisible: false });
	};

	handleSave = (e: any) => {
		this.setState({ modalVisible: true });
	};

	render() {
		let { modalVisible, modalLoading, fanCurves, newName } = this.state;
		return (
			<div>
				<PageHeader
					title="Fan Curve Editor"
					style={{ width: '100%', height: '8rem' }}>
					Modify fan speed configuration.
					<div
						style={{
							width: '100%',
							marginLeft: '60%',
							marginTop: '-3rem',
							display: 'flex',
							justifyContent: 'end',
						}}>
						<Select
							defaultSelect={fanCurves[0]}
							selectables={fanCurves}
							handleChange={this.chooseFanCurveThing}></Select>
					</div>
				</PageHeader>
				<div style={{ display: 'flex', justifyContent: 'center' }}>
					<ArmoryPlanSettings selectPlan={this.selectPlan}></ArmoryPlanSettings>
				</div>
				<div style={{ height: '1rem', width: '100%' }} />
				<canvas id="fanCurveChartCPU" className="Charto"></canvas>
				<canvas id="fanCurveChartGPU" className="Charto"></canvas>
				<Button onClick={(e) => this.handleSubmitCurves(e)}>Submit</Button>
				<Button onClick={(e) => this.handleSave(e)}>Save Configuration</Button>
				<Modal
					visible={modalVisible}
					title="Save Fan Configuration"
					onOk={this.handleModalOk}
					onCancel={this.handleModalCancel}
					footer={[
						<Button key="back" onClick={this.handleModalCancel}>
							Return
						</Button>,
						<Button
							key="submit"
							type="primary"
							loading={modalLoading}
							onClick={this.handleModalOk}>
							Submit
						</Button>,
					]}>
					<div>Configuration Name:</div>
					<Input
						type="text"
						title="Configuration Name:"
						aria-label="Configuration Name"
						value={newName}
						onChange={(e) => this.handleChangeName(e)}></Input>
				</Modal>
			</div>
		);
	}
}
