import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { debounce } from 'lodash';

import { List } from 'antd';
import InfiniteScroll from 'react-infinite-scroll-component';
import {
  Input,
  Typography,
  CaretDownSquareIcon,
  PlusCircleBorderIcon,
  PencilIcon,
  Checkbox,
  SearchIcon,
  WithDesignSystemThemeHoc,
} from '@databricks/design-system';
import { Link, withRouter } from 'react-router-dom';
import { experimentListSearchInput, searchExperimentsApi } from '../actions';
import {
  getExperimentListSearchInput,
  getExperimentListPreviousSearchInput,
  getExperiments,
  getSearchExperimentsNextPageToken,
  getLoadingMoreExperiments,
} from '../reducers/Reducers';
import Routes from '../routes';
import { CreateExperimentModal } from './modals/CreateExperimentModal';
import { DeleteExperimentModal } from './modals/DeleteExperimentModal';
import { RenameExperimentModal } from './modals/RenameExperimentModal';
import { IconButton } from '../../common/components/IconButton';
import { Spinner } from '../../common/components/Spinner';

export class ExperimentListView extends Component {
  static propTypes = {
    activeExperimentIds: PropTypes.arrayOf(PropTypes.string).isRequired,
    history: PropTypes.object.isRequired,
    // All below depend on connect
    dispatchSearchExperimentsApi: PropTypes.func.isRequired,
    dispatchSearchInput: PropTypes.func.isRequired,
    experiments: PropTypes.arrayOf(PropTypes.object).isRequired,
    searchInput: PropTypes.string.isRequired,
    previousSearchInput: PropTypes.string.isRequired,
    nextPageToken: PropTypes.string,
    loadingMore: PropTypes.bool.isRequired,
    designSystemThemeApi: PropTypes.shape({ theme: PropTypes.object }).isRequired,
  };

  state = {
    hidden: false,
    showCreateExperimentModal: false,
    showDeleteExperimentModal: false,
    showRenameExperimentModal: false,
    selectedExperimentId: '0',
    selectedExperimentName: '',
    checkedKeys: [],
    innerHeight: 90,
  };

  resizeObserver = null;

  componentDidMount() {
    // Dynamically set the height of the container list based on root element
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver((entries) => {
        const height = Math.abs(entries[0].contentRect.height * 0.8);
        this.setState({ innerHeight: height });
      });

      this.resizeObserver.observe(document.getElementById('root'));
    }
  }

  componentWillUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  handleSearchInputChange = (event) => {
    this.props.dispatchSearchInput(event.target.value);
  };

  debouncedHandleSearchInputChange = debounce(this.handleSearchInputChange, 10);

  handleLoadMore = (event) => {
    let params = {};
    const currentInput = this.props.searchInput;
    const previousInput = this.props.previousSearchInput;
    // Leave the filter off if we have a blank string.
    console.log('loading more');
    console.log(currentInput);
    console.log(previousInput);
    if (currentInput !== '') {
      params = { ...params, filter: `name LIKE '%${currentInput}%'` };
    }
    // Use a next page if the input was not altered to get more.
    if (currentInput === previousInput) {
      params = { ...params, pageToken: this.props.nextPageToken };
    }
    // Need to dispatch both to make the prior and current match on
    // multiple searches of the same input.
    this.props.dispatchSearchInput(currentInput);
    this.props.dispatchSearchExperimentsApi(params);
  };

  debouncedLoadMore = debounce(this.handleLoadMore, 1000);

  updateSelectedExperiment = (experimentId, experimentName) => {
    this.setState({
      selectedExperimentId: experimentId,
      selectedExperimentName: experimentName,
    });
  };

  handleCreateExperiment = () => {
    this.setState({
      showCreateExperimentModal: true,
    });
  };

  handleDeleteExperiment = (experimentId, experimentName) => () => {
    this.setState({
      showDeleteExperimentModal: true,
    });
    this.updateSelectedExperiment(experimentId, experimentName);
  };

  handleRenameExperiment = (experimentId, experimentName) => () => {
    this.setState({
      showRenameExperimentModal: true,
    });
    this.updateSelectedExperiment(experimentId, experimentName);
  };

  handleCloseCreateExperimentModal = () => {
    this.setState({
      showCreateExperimentModal: false,
    });
  };

  handleCloseDeleteExperimentModal = () => {
    this.setState({
      showDeleteExperimentModal: false,
    });
    // reset
    this.updateSelectedExperiment('0', '');
  };

  handleCloseRenameExperimentModal = () => {
    this.setState({
      showRenameExperimentModal: false,
    });
    // reset
    this.updateSelectedExperiment('0', '');
  };

  pushExperimentRoute = () => {
    if (this.state.checkedKeys.length > 0) {
      const route =
        this.state.checkedKeys.length === 1
          ? Routes.getExperimentPageRoute(this.state.checkedKeys[0])
          : Routes.getCompareExperimentsPageRoute(this.state.checkedKeys);
      this.props.history.push(route);
    }
  };

  handleCheck = (e, key) => {
    this.setState(
      (prevState) => ({
        checkedKeys:
          e === true && !prevState.checkedKeys.includes(key)
            ? [key, ...prevState.checkedKeys]
            : prevState.checkedKeys.filter((i) => i !== key),
      }),
      this.pushExperimentRoute,
    );
  };

  renderListItem = (item) => {
    const { activeExperimentIds, designSystemThemeApi } = this.props;
    const { checkedKeys } = this.state;
    const { theme } = designSystemThemeApi;
    const isActive = activeExperimentIds.includes(item.experiment_id);
    const isChecked = checkedKeys.includes(item.experiment_id);
    const dataTestId = isActive ? 'active-experiment-list-item' : 'experiment-list-item';
    // console.log(item.experiment_id);

    // Clicking the link removes all checks and marks other experiments
    // as not active.
    return (
      <div
        css={classNames.getExperimentListItemContainer(isActive, theme)}
        data-test-id={dataTestId}
        key={item.experiment_id}
      >
        <List.Item
          key={item.experiment_id}
          bordered='false'
          prefixCls={'experiment-list-meta'}
          css={classNames.experimentListItem}
          actions={[
            <Checkbox
              id={item.experiment_id}
              // key={item.experiment_id}
              onChange={(e) => this.handleCheck(e, item.experiment_id)}
              checked={isChecked || isActive}
              data-test-id='experiment-list-item-check-box'
            ></Checkbox>,
            <Link
              // key={item.experiment_id}
              className={'experiment-link'}
              to={Routes.getExperimentPageRoute(item.experiment_id)}
              onClick={(e) => {
                this.setState({ checkedKeys: [item.experiment_id] });
              }}
              title={item.name}
              data-test-id='experiment-list-item-link'
            >
              {item.name}
            </Link>,
            <IconButton
              // key={item.experiment_id}
              icon={<PencilIcon />}
              onClick={this.handleRenameExperiment(item.experiment_id, item.name)}
              data-test-id='rename-experiment-button'
              css={classNames.renameExperiment}
            />,
            <IconButton
              // key={item.experiment_id}
              icon={<i className='far fa-trash-o' />}
              onClick={this.handleDeleteExperiment(item.experiment_id, item.name)}
              css={classNames.deleteExperiment}
              data-test-id='delete-experiment-button'
            />,
          ]}
        ></List.Item>
      </div>
    );
  };

  render() {
    const { activeExperimentIds, experiments, searchInput, loadingMore, nextPageToken } = this.props;
    const { hidden, innerHeight } = this.state;
    console.log('render');
    console.log(experiments.length);

    if (hidden) {
      return (
        <CaretDownSquareIcon
          rotate={-90}
          onClick={() => this.setState({ hidden: false })}
          css={{ fontSize: '24px' }}
          title='Show experiment list'
        />
      );
    }

    return (
      <div id='experiment-list-outer-container' css={classNames.experimentListOuterContainer}>
        <CreateExperimentModal
          isOpen={this.state.showCreateExperimentModal}
          onClose={this.handleCloseCreateExperimentModal}
        />
        <DeleteExperimentModal
          isOpen={this.state.showDeleteExperimentModal}
          onClose={this.handleCloseDeleteExperimentModal}
          activeExperimentIds={activeExperimentIds}
          experimentId={this.state.selectedExperimentId}
          experimentName={this.state.selectedExperimentName}
        />
        <RenameExperimentModal
          isOpen={this.state.showRenameExperimentModal}
          onClose={this.handleCloseRenameExperimentModal}
          experimentId={this.state.selectedExperimentId}
          experimentName={this.state.selectedExperimentName}
        />
        <div>
          <div css={classNames.experimentTitleContainer}>
            <Typography.Title level={2} css={classNames.experimentTitle}>
              Experiments
            </Typography.Title>
            <PlusCircleBorderIcon
              onClick={this.handleCreateExperiment}
              css={{
                fontSize: '24px',
                marginLeft: 'auto',
              }}
              title='New Experiment'
              data-test-id='create-experiment-button'
            />
            <CaretDownSquareIcon
              onClick={() => this.setState({ hidden: true })}
              rotate={90}
              css={{ fontSize: '24px' }}
              title='Hide experiment list'
            />
          </div>
          <div css={classNames.experimentSearchContainer}>
            <Input
              placeholder='Search Experiments'
              aria-label='search experiments'
              value={searchInput}
              onChange={this.handleSearchInputChange}
              onPressEnter={this.debouncedLoadMore}
              data-test-id='search-experiment-input'
              css={classNames.experimentSearchInput}
            />
            <SearchIcon
              onClick={this.handleLoadMore}
              title='Search/load more experiments'
              css={classNames.experimentSearchIcon}
            />
          </div>
          <div id='scrollableDiv' css={classNames.experimentListContainer}>
          <InfiniteScroll
            dataLength={experiments.length}
            next={this.debouncedLoadMore}
            hasMore={nextPageToken ? true : false}
            endMessage={<Typography.Text> No more experiments. </Typography.Text>}
            loader={<Typography.Text > Loading... </Typography.Text>}
            scrollableTarget={'scrollableDiv'}
            // scrollThreshold={.99}
          >
                {experiments.map((item) => this.renderListItem(item))}
        </InfiniteScroll>
        </div>
        </div>
      </div>
    );
  }
}

              // <List
                // dataSource={experiments}
                // split={false}
                // loading={{ indicator: <Spinner />, spinning: loadingMore }}
const classNames = {
  experimentListOuterContainer: {
    boxSizing: 'border-box',
    marginLeft: '24px',
    marginRight: '8px',
    paddingRight: '16px',
    width: '100%',
    // Ensure it displays experiment names for smaller screens, but don't
    // take more than 20% of the screen.
    minWidth: 'max(280px, 20vw)',
    maxWidth: '20vw',
  },
  experimentTitleContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  experimentTitle: {
    margin: 0,
  },
  experimentSearchContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  experimentSearchInput: {
    margin: 0,
    flex: '6 1 0',
  },
  experimentSearchIcon: {
    fontSize: '24px',
    marginLeft: 'auto',
    flex: '1 1 0',
  },
  experimentListContainer: {
    marginTop: '12px',
    // TODO
    // maxHeight: '80vh',
    // display: 'flex',
    height: '500px',
    // height: '900px',
    overflow: 'auto',
    paddingBottom: '12px',
    paddingTop: '12px'
  },
  getExperimentListItemContainer: (isActive, theme) => ({
    display: 'flex',
    marginLeft: '1px',
    marginRight: '8px',
    paddingRight: '5px',
    borderLeft: isActive ? `solid ${theme.colors.primary}` : 'transparent',
    backgroundColor: isActive ? theme.colors.actionDefaultBackgroundPress : 'transparent',
  }),
  experimentListItem: {
    display: 'grid',
    // Make the items line up
    width: '100%',
    '.experiment-list-meta-item-action': {
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto auto',
      paddingLeft: '0px',
      marginBottom: '4px',
      marginTop: '4px',
      li: {
        paddingRight: '4px',
        paddingLeft: '4px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'left',
        fontSize: '13px',
      },
    },
  },
  renameExperiment: {
    justifySelf: 'end',
  },
  // Use a larger margin to avoid overlapping the vertical scrollbar
  deleteExperiment: {
    justifySelf: 'end',
    marginRight: '10px',
  },
};

const mapStateToProps = (state) => {
  const allExperiments = getExperiments(state);
  const searchInput = getExperimentListSearchInput(state);
  const previousSearchInput = getExperimentListPreviousSearchInput(state);
  const lowerCasedSearchInput = searchInput.toLowerCase();
  const loadingMore = getLoadingMoreExperiments(state);
  let experiments = [];
  if (lowerCasedSearchInput !== '') {
    experiments = allExperiments.filter(({ name }) =>
      name.toLowerCase().includes(lowerCasedSearchInput),
    );
  } else {
    experiments = allExperiments;
  }
  const nextPageToken = getSearchExperimentsNextPageToken(state);
  console.log(nextPageToken);
  console.log(experiments.length);
  console.log(previousSearchInput);
  console.log(searchInput);
  return { experiments, nextPageToken, searchInput, previousSearchInput, loadingMore };
};

const mapDispatchToProps = (dispatch) => {
  return {
    dispatchSearchExperimentsApi: (params) => {
      return dispatch(searchExperimentsApi(params))
    },
    dispatchSearchInput: (input) => {
      return dispatch(experimentListSearchInput(input));
    },
  };
};

export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(WithDesignSystemThemeHoc(ExperimentListView)),
);
