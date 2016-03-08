import React from 'react'
import { Map, TileLayer, Marker } from 'react-leaflet'

export default React.createClass({
  propTypes: {
    content: React.PropTypes.array,
    parentState: React.PropTypes.func
  },
  getInitialState: function () {
    return {
      position: this.props.content
    }
  },
  changePosition: function (e) {
    if (!e) return
    this.setState({position: [e.latlng.lat, e.latlng.lng]}, this.update)
  },
  update: function () {
    this.props.parentState(this.state.position)
  },
  componentDidMount: function () {
    this.update()
  },
  render () {
    return (
      <Map center={ this.props.content } zoom={ 17 } id='map' onClick={ this.changePosition }>
        <TileLayer
          url='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
      <Marker position={ this.state.position }/>
      </Map>
    )
  }
})