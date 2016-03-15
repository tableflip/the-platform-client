import React from 'react'
import Loader from '../components/loader'
import OverlayLoader from '../components/overlay-loader'
import Breadcrumbs from '../components/breadcrumbs'
import ValidationError from '../components/validation-error'
import fields from '../components/field-lookup'
import * as validator from '/lib/imports/validator'

export default React.createClass({
  mixins: [ReactMeteorData],
  propTypes: {
    projectId: React.PropTypes.string,
    field: React.PropTypes.string || null
  },
  getMeteorData () {
    var projectSub = Meteor.subscribe('project', this.props.projectId)
    let project = Projects.findOne({ _id: this.props.projectId })
    return {
      projectReady: projectSub.ready(),
      project: project
    }
  },
  render () {
    if (!this.data.projectReady) return (<Loader loaded={false} />)
    var props = {
      project: this.data.project,
      field: this.props.field
    }
    return (<div>
      <ProjectField {...props} />
    </div>)
  }
})

var ProjectField = React.createClass({
  propTypes: {
    project: React.PropTypes.object,
    field: React.PropTypes.string
  },
  getInitialState () {
    let project = this.props.project
    let field = this.props.field
    let type = (project.schema[field] && project.schema[field].type) || 'text'
    let content = project.facts.json[field]
    let newContent = (content instanceof Object) ? Object.assign({}, content) : content
    return { type, content, newContent }
  },
  isValid () {
    let validation = validator.validateDocField({
      doc: this.props.project,
      field: this.props.field,
      newValue: this.state.newContent
    })
    if (validation.error) {
      this.setState({ validationError: validation.error })
    } else {
      this.setState({ validationError: null })
    }
    return validation.error
  },
  update (newContent) {
    this.setState({ newContent })
  },
  save: function (e) {
    e.preventDefault()
    if (!this.isValid()) return
    let payload = {
      projectId: this.props.project._id,
      key: this.props.field,
      newValue: this.state.newContent
    }
    this.setState({ saving: true })
    Meteor.call('projects/updateFact', payload, (err) => {
      this.setState({ saving: false })
      if (err) {
        this.setState({ validationError: 'Cannot update project facts' })
        return console.error(err)
      }
      FlowRouter.go('project-facts', { projectId: this.props.project._id })
    })
  },
  render () {
    let fieldComponent = fields(this.state.type, this.state.content, this.update)
    return (
      <div>
        <Breadcrumbs pages={[
          { text: 'Home', href: '/' },
          { text: 'Site', href: `/project/${this.props.project._id}` },
          { text: 'Facts', href: `/project/${this.props.project._id}/facts` }
        ]} />
        <div className="container">
          <p className="lead m-t-1">Edit <code>{this.props.field}</code></p>
          <div className="m-y-1">
            { fieldComponent }
          </div>
          <ValidationError message={this.state.validationError} />
          <div className="m-b-1">
            <button type='submit' className='btn btn-primary' onClick={this.save}>Save</button>
            <a href={`/project/${this.props.project._id}/facts`} className="btn btn-link">Cancel</a>
          </div>
        </div>
        <OverlayLoader loaded={!this.state.saving} />
      </div>
    )
  }
})
