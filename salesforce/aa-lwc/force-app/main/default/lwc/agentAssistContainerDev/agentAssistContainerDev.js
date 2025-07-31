import { LightningElement, api, wire } from 'lwc';
import { getRecord } from "lightning/uiRecordApi";
import { subscribeToVoiceToolkit, unsubscribeFromVoiceToolkit, scvEventNames } from './lib/voiceToolkit';

// great examples here
// https://github.com/service-cloud-voice/examples-from-doc/blob/main/ToolkitAPI/sampleLWCComponent/sampleLWCComponent.js

const FIELDS = [
  "VoiceCall.CallType",
  "VoiceCall.FromPhoneNumber",
  "VoiceCall.ToPhoneNumber"
]

export default class AgentAssistContainerDev extends LightningElement {
  @api recordId;
  @wire(getRecord, { recordId: '$recordId', fields: FIELDS }) voiceCall;

  get CallType() {
    return this.voiceCall.data.fields.CallType.value;
  }

  get FromPhoneNumber() {
    return this.voiceCall.data.fields.FromPhoneNumber.value;
  }

  get ToPhoneNumber() {
    return this.voiceCall.data.fields.ToPhoneNumber.value;
  }

  conversationId = ''

  payload = '{"key": "value"}';
  teleEvent = "No events received yet.";
  transcript = "No transcripts received yet.";
  previewPhoneNumber = "";
  addParticipantPhoneNumber = "";
  sendDigits = "";
  comboBoxHoldValue = "Initial_Caller";
  comboBoxResumeValue = "Initial_Caller";
  comboBoxRemoveParticipantValue = "Agent";
  comboBoxContactTypeValue = "PhoneNumber";
  comboBoxAddParticipantContactTypeValue = "PhoneNumber";
  hasRendered = false;

  count = 0

  constructor() {
    super();
    this.telephonyEventListener = this.onTelephonyEvent.bind(this);
  }

  handleClick(event) {
    console.log('handleClick called for AgentAssistContainerDev');
    console.log(event);
    this.count += 1
  }

  connectedCallback() {
    console.log('connectedCallback called for AgentAssistContainerDev');
  }
  disconnectedCallback() {
    console.log('disconnectedCallback called for AgentAssistContainerDev');
  }
  renderedCallback() {
    console.log('renderedCallback called for AgentAssistContainerDev');
    const toolkitApi = this.template.querySelector('lightning-service-cloud-voice-toolkit-api');
    unsubscribeFromVoiceToolkit(toolkitApi, this.telephonyEventListener);
    // console.log('finished unsubscribing from voiceToolkit events');
    subscribeToVoiceToolkit(toolkitApi, this.telephonyEventListener);
    // console.log('finished subscribing to voiceToolkit events');
  }

  onTelephonyEvent(event) {
    console.log(`[onTelephonyEvent] ${event.type}:`, event);
    if (event.type === 'callconnected') {
      this.conversationId = `nice-${event.detail.callId}`
      console.log('this.conversationId', this.conversationId)
    }
    if (
      (event.type === "callstarted" || event.type === "callconnected") &&
      this.comboBoxRemoveParticipantValue === "Agent"
    ) {
      this.isTelephonyActionControlsDisabled = false;
    }
    if (event.type === "callended") {
      this.isTelephonyActionControlsDisabled = true;
    }

    if (event.type === "transcript") {
      this.transcript = JSON.stringify(event.detail);
    }

    this.teleEvent = JSON.stringify(event);
  }

  getToolkitApi() {
    return this.template.querySelector(
      "lightning-service-cloud-voice-toolkit-api"
    );
  }

  get options() {
    return [
      { label: "INITIAL_CALLER", value: "Initial_Caller" },
      { label: "THIRD_PARTY", value: "Third_Party" },
    ];
  }

  get endCallOptions() {
    return [
      { label: "AGENT", value: "Agent" },
      { label: "INITIAL_CALLER", value: "Initial_Caller" },
      { label: "THIRD_PARTY", value: "Third_Party" },
    ];
  }

  get contactOptions() {
    return [
      { label: "PHONE NUMBER", value: "PhoneNumber" },
      { label: "AGENT/QUEUE ID", value: "AgentOrQueueId" },
    ];
  }

  handleComboboxHoldChange(event) {
    this.comboBoxHoldValue = event.detail.value;
  }

  handleComboboxResumeChange(event) {
    this.comboBoxResumeValue = event.detail.value;
  }

  handleComboboxRemoveParticipantChange(event) {
    this.comboBoxRemoveParticipantValue = event.detail.value;
  }

  handleComboboxContactTypeChange(event) {
    this.comboBoxContactTypeValue = event.detail.value;
  }

  handleComboboxContactTypeAddParticipantChange(event) {
    this.comboBoxAddParticipantContactTypeValue = event.detail.value;
  }

  changePreviewCallHandler(event) {
    this.previewPhoneNumber = event.target.value;
  }

  changeAddParticipantHandler(event) {
    this.addParticipantPhoneNumber = event.target.value;
  }

  changeSendDigitsHandler(event) {
    this.sendDigits = event.target.value;
  }

  onMute() {
    this.getToolkitApi().mute();
  }

  onUnmute() {
    this.getToolkitApi().unmute();
  }

  onAcceptCall() {
    this.getToolkitApi().acceptCall();
  }

  onDeclineCall() {
    this.getToolkitApi().declineCall();
  }

  onEndCall() {
    this.getToolkitApi().endCall(this.comboBoxRemoveParticipantValue);
  }

  onSendDigits() {
    this.getToolkitApi().sendDigits(this.sendDigits);
  }

  onPauseRecording() {
    this.getToolkitApi().pauseRecording();
  }

  onResumeRecording() {
    this.getToolkitApi().resumeRecording();
  }

  onHold() {
    this.getToolkitApi().hold(this.comboBoxHoldValue);
  }

  onResume() {
    this.getToolkitApi().resume(this.comboBoxResumeValue);
  }

  onSwap() {
    this.getToolkitApi().swap();
  }

  onMerge() {
    this.getToolkitApi().merge();
  }

  onStartPreviewCall() {
    this.getToolkitApi().startPreviewCall(this.previewPhoneNumber);
  }

  onAddParticipant() {
    this.getToolkitApi().addParticipant(
      this.comboBoxAddParticipantContactTypeValue,
      this.addParticipantPhoneNumber,
      false
    );
  }

  onAddParticipantViaBlindTransfer() {
    this.getToolkitApi().addParticipant(
      this.comboBoxAddParticipantContactTypeValue,
      this.addParticipantPhoneNumber,
      true
    );
  }
}