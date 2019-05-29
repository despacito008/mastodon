import React from 'react';
import { connect } from 'react-redux';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import StatusListContainer from '../ui/containers/status_list_container';
import Column from '../../components/column';
import ColumnHeader from '../../components/column_header';
import { expandPublicTimeline } from '../../actions/timelines';
import { addColumn, removeColumn, moveColumn } from '../../actions/columns';
import ColumnSettingsContainer from './containers/column_settings_container';
import { connectPublicStream } from '../../actions/streaming';

const messages = defineMessages({
  title: { id: 'column.public', defaultMessage: 'Federated timeline' },
});

const mapStateToProps = (state, { columnId }) => {
  const uuid = columnId;
  const columns = state.getIn(['settings', 'columns']);
  const index = columns.findIndex(c => c.get('uuid') === uuid);
  const onlyMedia = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'other', 'onlyMedia']) : state.getIn(['settings', 'public', 'other', 'onlyMedia']);
  const timelineState = state.getIn(['timelines', `public${onlyMedia ? ':media' : ''}`]);

  return {
    hasUnread: !!timelineState && timelineState.get('unread') > 0,
    onlyMedia,
    noBots,
  };
};

export default @connect(mapStateToProps)
@injectIntl
class PublicTimeline extends React.PureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static defaultProps = {
    onlyMedia: false,
    noBots: false,
  };

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    shouldUpdateScroll: PropTypes.func,
    intl: PropTypes.object.isRequired,
    columnId: PropTypes.string,
    multiColumn: PropTypes.bool,
    hasUnread: PropTypes.bool,
    onlyMedia: PropTypes.bool,
    noBots: PropTypes.bool,
  };

  handlePin = () => {
    const { columnId, dispatch, onlyMedia, noBots } = this.props;

    if (columnId) {
      dispatch(removeColumn(columnId));
    } else {
      dispatch(addColumn('PUBLIC', { other: { onlyMedia, noBots } }));
    }
  }

  handleMove = (dir) => {
    const { columnId, dispatch } = this.props;
    dispatch(moveColumn(columnId, dir));
  }

  handleHeaderClick = () => {
    this.column.scrollTop();
  }

  componentDidMount () {
    const { dispatch, onlyMedia, noBots } = this.props;

    dispatch(expandPublicTimeline({ onlyMedia, noBots }));
    this.disconnect = dispatch(connectPublicStream({ onlyMedia, noBots }));
  }

  componentDidUpdate (prevProps) {
    if (prevProps.onlyMedia !== this.props.onlyMedia || prevProps.noBots !== this.props.noBots) {
      const { dispatch, onlyMedia, noBots } = this.props;

      this.disconnect();
      dispatch(expandPublicTimeline({ onlyMedia, noBots }));
      this.disconnect = dispatch(connectPublicStream({ onlyMedia, noBots }));
    }
  }

  componentWillUnmount () {
    if (this.disconnect) {
      this.disconnect();
      this.disconnect = null;
    }
  }

  setRef = c => {
    this.column = c;
  }

  handleLoadMore = maxId => {
    const { dispatch, onlyMedia, noBots } = this.props;

    dispatch(expandPublicTimeline({ maxId, onlyMedia, noBots }));
  }

  render () {
    const { intl, shouldUpdateScroll, columnId, hasUnread, multiColumn, onlyMedia } = this.props;
    const pinned = !!columnId;

    return (
      <Column bindToDocument={!multiColumn} ref={this.setRef} label={intl.formatMessage(messages.title)}>
        <ColumnHeader
          icon='globe'
          active={hasUnread}
          title={intl.formatMessage(messages.title)}
          onPin={this.handlePin}
          onMove={this.handleMove}
          onClick={this.handleHeaderClick}
          pinned={pinned}
          multiColumn={multiColumn}
        >
          <ColumnSettingsContainer columnId={columnId} />
        </ColumnHeader>

        <StatusListContainer
          timelineId={`public${onlyMedia ? ':media' : ''}`}
          onLoadMore={this.handleLoadMore}
          trackScroll={!pinned}
          scrollKey={`public_timeline-${columnId}`}
          emptyMessage={<FormattedMessage id='empty_column.public' defaultMessage='There is nothing here! Write something publicly, or manually follow users from other servers to fill it up' />}
          shouldUpdateScroll={shouldUpdateScroll}
          bindToDocument={!multiColumn}
        />
      </Column>
    );
  }

}
