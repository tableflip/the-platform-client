import async from 'async'
import * as githubMethods from './github-methods'

export function syncAll (userId, cb) {
  var projects = githubMethods.getRepos(userId)
  async.map(projects, (project, cb) => {
    syncProject(userId, project.full_name, cb)
  }, (err, res) => {
    if (err) return cb(err)
    cb(null, res.reduce((memo, obj) => {
      memo.numberAffected += obj.numberAffected
      return memo
    }, { numberAffected: 0 }))
  })
}

export function syncProject (userId, fullName, cb) {
  async.parallel({
    lastCommit: cb => {
      githubMethods.getLastCommit(userId, fullName, cb)
    },
    facts: cb => {
      githubMethods.getFacts(userId, fullName, cb)
    }
  }, (err, res) => {
    if (err) return cb(err)
    if (Projects.find({ full_name: fullName, 'lastCommit.sha': res.lastCommit[0].sha }).count()) {
      console.log(`Not syncing ${fullName} as we already have the most recent commit`)
      return cb(null, { numberAffected: 0 })
    }
    var project = {
      full_name: fullName,
      lastCommit: {
        sha: res.lastCommit[0].sha,
        dateTime: res.lastCommit[0].commit.committer.date
      },
      facts: res.facts
    }
    var ret = Projects.upsert({ full_name: fullName }, { $set: project, $addToSet: { users: userId } })
    syncPages(userId, fullName, cb)
  })
}

export function syncPages (userId, fullName, masterCb) {
  var project = Projects.findOne({ full_name: fullName })
  if (!project) return masterCb('Cannot find matching project')
  async.waterfall([
    function getPageMetadata (cb) {
      githubMethods.getPages(userId, fullName, cb)
    },
    function filterPages (pages, cb) {
      var filteredPages = pages.filter(page => {
        return !Pages.find({
          'project.full_name': fullName,
          'name': page.name,
          'lastCommit.dir.sha': page.sha
        }).count()
      })
      cb(null, filteredPages)
    },
    Meteor.bindEnvironment(function getUpdatedPageContents (pages, cb) {
      async.map(pages, (page, cb) => {
        githubMethods.getPageContents(userId, fullName, page.name, (err, res) => {
          if (err) return cb(err)
          res.dirSha = page.sha
          cb(null, res)
        })
      }, cb)
    }, masterCb),
    function updatePages (pagesDetails, cb) {
      pagesDetails.forEach(pageDetails => {
        var page = {
          name: pageDetails.name,
          project: {
            _id: project._id,
            full_name: project.full_name
          },
          lastCommit: {
            content: {
              sha: pageDetails.sha
            },
            dir: {
              sha: pageDetails.dirSha
            }
          },
          content: pageDetails.content
        }
        Pages.upsert({ name: pageDetails.name, 'project.full_name': project.full_name }, { $set: page })
      })
      cb(null, { numberAffected: pagesDetails.length })
    }
  ], (err, res) => {
    masterCb(err, res)
  })
}
