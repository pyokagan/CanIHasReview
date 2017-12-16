'use strict';

exports.publicPath = '/static/';
exports.publicOutputDir = 'static';

exports.repoConfigs = {
    'pyokagan/test': {
        removeLabelsOnSubmit: ['s.Ongoing'],
        addLabelsOnSubmit: ['s.ToReview'],
    },
    'pyokagan/CanIHasReview': {
        addLabelsOnSubmit: ['ReadyForReview'],
    },
    'se-edu/addressbook-level1': {
        removeLabelsOnSubmit: ['s.Ongoing', 's.OnHold', 's.ToMerge', 's.MergeApproved'],
        addLabelsOnSubmit: ['s.ToReview'],
        checks: ['no-merge-commits', 'no-out-of-date', 'too-many-commits'],
    },
    'se-edu/addressbook-level2': {
        removeLabelsOnSubmit: ['s.Ongoing', 's.OnHold', 's.ToMerge', 's.MergeApproved'],
        addLabelsOnSubmit: ['s.ToReview'],
        checks: ['no-merge-commits', 'no-out-of-date', 'too-many-commits'],
    },
    'se-edu/addressbook-level3': {
        removeLabelsOnSubmit: ['s.Ongoing', 's.OnHold', 's.ToMerge', 's.MergeApproved'],
        addLabelsOnSubmit: ['s.ToReview'],
        checks: ['no-merge-commits', 'no-out-of-date', 'too-many-commits'],
    },
    'se-edu/addressbook-level4': {
        removeLabelsOnSubmit: ['s.Ongoing', 's.OnHold', 's.ToMerge', 's.MergeApproved'],
        addLabelsOnSubmit: ['s.ToReview'],
        checks: ['no-merge-commits', 'no-out-of-date', 'too-many-commits'],
    },
    'se-edu/se-edu-bot': {
        removeLabelsOnSubmit: ['s.Ongoing', 's.ToMerge'],
        addLabelsOnSubmit: ['s.ToReview'],
        checks: ['no-merge-commits', 'no-out-of-date', 'too-many-commits'],
    },
    'oss-generic/process': {
        removeLabelsOnSubmit: ['s.Ongoing', 's.OnHold', 's.ToMerge', 's.MergeApproved'],
        addLabelsOnSubmit: ['s.ToReview'],
        checks: ['no-merge-commits', 'no-out-of-date', 'too-many-commits'],
    },
    'TEAMMATES/teammates': {
        removeLabelsOnSubmit: ['s.Ongoing', 's.OnHold', 's.ToMerge', 's.MergeApproved'],
        addLabelsOnSubmit: ['s.ToReview'],
        checks: ['no-merge-commits', 'no-out-of-date', 'too-many-commits'],
    },
};
