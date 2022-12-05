/**
 * View component for /tasks/:taskId
 *
 * Displays a single task from the 'byId' map in the task reducer
 * as defined by the 'selected' property
 */

// import primary libraries
import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import moment from "moment";

// import actions
import * as taskActions from "../taskActions";
import * as noteActions from "../../note/noteActions";

// import global components
import Binder from "../../../global/components/Binder.js.jsx";
import AlertModal from "../../../global/components/modals/AlertModal.js.jsx";
import CheckboxInput from "../../../global/components/forms/CheckboxInput.js.jsx";

// import resource components
import TaskLayout from "../components/TaskLayout.js.jsx";
import NoteForm from "../../note/components/NoteForm.js.jsx";

class SingleTask extends Binder {
  constructor(props) {
    super(props);
    this.state = {
      // note: {},
      showNoteForm: false,
      note: _.cloneDeep(this.props.defaultNote.obj),
      task: _.cloneDeep(this.props.defaultTask.obj),
      isApproveModalOpen: false,
      isRejectModalOpen: false,
      // note: _.cloneDeep(this.props.defaultNote.obj),
      // NOTE: We don't want to actually change the store's defaultItem, just use a copy
      noteFormHelpers: {},
      /**
       * NOTE: formHelpers are useful for things like radio controls and other
       * things that manipulate the form, but don't directly effect the state of
       * the task
       */
    };
    this._bind(
      "_handleFormChange",
      "_handleFormSubmit",
      "_openApproveModal",
      "_openRejectModal",
      "_confirmApprove",
      "_confirmReject",
      "getTaskCheckbox"
    );
  }

  componentDidMount() {
    const { dispatch, match } = this.props;
    dispatch(taskActions.fetchSingleIfNeeded(match.params.taskId));
    dispatch(taskActions.fetchDefaultTask());
    dispatch(noteActions.fetchDefaultNote());
    dispatch(noteActions.fetchListIfNeeded("_task", match.params.taskId));
  }

  componentWillReceiveProps(nextProps) {
    const { dispatch, match } = this.props;
    dispatch(noteActions.fetchListIfNeeded("_task", match.params.taskId));
    this.setState({
      note: _.cloneDeep(nextProps.defaultNote),
    });
    this.setState({
      task: _.cloneDeep(nextProps.defaultTask),
    });
  }

  _handleFormChange(e) {
    /**
     * This let's us change arbitrarily nested objects with one pass
     */
    let newState = _.update(this.state, e.target.name, () => {
      return e.target.value;
    });
    this.setState({ newState });
  }

  _handleFormSubmit(e) {
    e.preventDefault();
    const { dispatch, match, defaultNote, userStore, flowStore } = this.props;
    let newNote = { ...this.state.note };
    newNote._task = match.params.taskId;
    newNote._user = userStore.loggedIn.user._id;
    newNote._userFirstName = userStore.loggedIn.user.firstName;
    newNote._userLastName = userStore.loggedIn.user.lastName;
    newNote._flow = flowStore.selected.id;
    dispatch(noteActions.sendCreateNote(newNote)).then((noteRes) => {
      if (noteRes.success) {
        dispatch(noteActions.invalidateList("_task", match.params.taskId));
        this.setState({
          note: _.cloneDeep(defaultNote.obj),
        });
      } else {
        alert("ERROR - Check logs");
      }
    });
  }

  _openApproveModal() {
    this.setState({ isApproveModalOpen: !this.state.isApproveModalOpen });
  }
  _openRejectModal() {
    this.setState({ isRejectModalOpen: !this.state.isRejectModalOpen });
  }

  _confirmApprove() {
    const { dispatch, history, match, taskStore } = this.props;
    const selectedTask = taskStore.selected.getItem();
    let newTask = { ...selectedTask };
    newTask._id = match.params.taskId;
    newTask.status = "approved";
    dispatch(taskActions.sendUpdateTask(newTask)).then((taskRes) => {
      if (taskRes.success) {
        history.push(`/tasks/${taskRes.item._id}`);
      }
    });
    this.setState({ isApproveModalOpen: false });
  }
  _confirmReject() {
    const { dispatch, history, match, taskStore } = this.props;
    const selectedTask = taskStore.selected.getItem();
    let newTask = { ...selectedTask };
    newTask._id = match.params.taskId;
    newTask.status = "rejected";
    dispatch(taskActions.sendUpdateTask(newTask)).then((taskRes) => {
      if (taskRes.success) {
        history.push(`/tasks/${taskRes.item._id}`);
      }
    });
    this.setState({ isRejectModalOpen: false });
  }

  getTaskCheckbox(selectedTask) {
    let component;
    switch (selectedTask.status) {
      case "approved":
        component = (
          <CheckboxInput
            label={selectedTask.name}
            value={selectedTask.complete}
            disabled
            color="green"
          ></CheckboxInput>
        );
        break;
      case "rejected":
        component = (
          <CheckboxInput
            label={selectedTask.name}
            value={selectedTask.complete}
            disabled
            color="red"
          ></CheckboxInput>
        );
        break;
      case "open":
        component = (
          <CheckboxInput
            label={selectedTask.name}
            value={selectedTask.complete}
            disabled
            color="blue"
          ></CheckboxInput>
        );
      // code block
    }
    return component;
  }

  render() {
    const { taskStore, noteStore, match, defaultNote, userStore } = this.props;
    const { noteFormHelpers, note } = this.state;

    const selectedTask = taskStore.selected.getItem();
    const userRole =
      Object.keys(userStore.loggedIn.user).length !== 0
        ? userStore.loggedIn.user.roles[0]
        : "";

    const noteList =
      noteStore.lists && noteStore.lists._task
        ? noteStore.lists._task[match.params.taskId]
        : null;

    const noteListItems = noteStore.util.getList("_task", match.params.taskId);

    const isTaskEmpty =
      !selectedTask || !selectedTask._id || taskStore.selected.didInvalidate;

    const isTaskFetching = taskStore.selected.isFetching;

    const isNoteListEmpty = !noteListItems || !noteList;

    const isNoteListFetching =
      !noteListItems || !noteList || noteList.isFetching;

    // const checkboxComponent = this.getTaskCheckbox(selectedTask.status);

    return (
      <TaskLayout>
        <h3> Single Task </h3>
        {isTaskEmpty ? (
          isTaskFetching ? (
            <h2>Loading...</h2>
          ) : (
            <h2>Empty.</h2>
          )
        ) : (
          <div>
            <div style={{ opacity: isTaskFetching ? 0.5 : 1 }}>
              {this.getTaskCheckbox(selectedTask)}
              <p> {selectedTask.description}</p>
              <Link
                className="yt-btn x-small bordered info"
                to={`${this.props.match.url}/update`}
              >
                {" "}
                Edit Task
              </Link>{" "}
              {userRole ? (
                <button
                  className="yt-btn x-small bordered success"
                  type="button"
                  onClick={this._openApproveModal}
                >
                  {" "}
                  Approve Task{" "}
                </button>
              ) : null}{" "}
              {userRole ? (
                <button
                  className="yt-btn x-small bordered danger"
                  type="button"
                  onClick={this._openRejectModal}
                >
                  {" "}
                  Reject Task{" "}
                </button>
              ) : null}{" "}
              <hr />
              {isNoteListEmpty ? (
                isNoteListFetching ? (
                  <h2>Loading...</h2>
                ) : (
                  <h2>Empty.</h2>
                )
              ) : (
                <div style={{ opacity: isNoteListFetching ? 0.5 : 1 }}>
                  <ul>
                    {noteListItems.map((note, i) => {
                      return (
                        <li key={note._id + i}>
                          <h4>
                            <strong>{`${note._userFirstName} ${note._userLastName}`}</strong>
                          </h4>
                          <h5>{`${moment(note.created).format(
                            "MM/DD/YYYY"
                          )} @ ${moment(note.created).format("hh:mm A")}`}</h5>
                          <p>{note.name}</p>
                          <hr />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <br />
            </div>
            <NoteForm
              note={Object.keys(note).length === 0 ? { name: "" } : note}
              cancelLink={`${this.props.match.url}`}
              formHelpers={noteFormHelpers}
              formType="create"
              handleFormChange={this._handleFormChange}
              handleFormSubmit={this._handleFormSubmit}
            />
          </div>
        )}
        <AlertModal
          alertMessage={
            <div>
              Are you <em>sure</em> you want to approve this task? This cannot
              be undone.
            </div>
          }
          alertTitle="Approve Task"
          closeAction={this._openApproveModal}
          confirmAction={this._confirmApprove}
          confirmText="Yes, Approve this task"
          declineAction={this._openApproveModal}
          declineText="Never mind"
          isOpen={this.state.isApproveModalOpen}
          type="success"
        />
        <AlertModal
          alertMessage={
            <div>
              Are you <em>sure</em> you want to reject this task? This cannot be
              undone.
            </div>
          }
          alertTitle="Reject Task"
          closeAction={this._openRejectModal}
          confirmAction={this._confirmReject}
          confirmText="Yes, Reject this task"
          declineAction={this._openRejectModal}
          declineText="Never mind"
          isOpen={this.state.isRejectModalOpen}
          type="danger"
        />
      </TaskLayout>
    );
  }
}

SingleTask.propTypes = {
  dispatch: PropTypes.func.isRequired,
};

const mapStoreToProps = (store) => {
  /**
   * NOTE: Yote refer's to the global Redux 'state' as 'store' to keep it mentally
   * differentiated from the React component's internal state
   */
  // console.log(store)
  return {
    taskStore: store.task,
    defaultNote: store.note.defaultItem,
    defaultTask: store.task.defaultItem,
    noteStore: store.note,
    flowStore: store.flow,
    userStore: store.user,
  };
};

export default withRouter(connect(mapStoreToProps)(SingleTask));
