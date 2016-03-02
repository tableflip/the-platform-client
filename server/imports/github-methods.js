import async from 'async'
import githubInterface from './github-interface'
import isPlatformProject from './is-platform-project'

export function getRepos (userId) {
  var github = githubInterface(userId)
  return github.getRepos().filter(isPlatformProject)
}

export function getLastCommit (userId, fullName, cb) {
  var github = githubInterface(userId)
  return github.getLastCommit(fullName, cb)
}

export function getFacts (userId, fullName, cb) {
  var github = githubInterface(userId)
  async.waterfall([
    function getRootDirContents (cb) {
      github.getDirContents(fullName, '', cb)
    },
    function getFacts (res, cb) {
      var factsJson = res.find(obj => obj.type === 'file' && obj.name === 'facts.json')
      github.getFileContents(fullName, 'facts.json', (err, res) => {
        cb(err, { sha: factsJson.sha, content: res })
      })
    }
  ], (err, data) => {
    if (err) return cb(err)
    cb(null, {
      sha: data.sha,
      content: JSON.parse(data.content)
    })
  })
}

export function getPages (userId, fullName, cb) {
  var github = githubInterface(userId)
  github.getDirContents(fullName, 'pages', (err, res) => {
    if (err) return cb(err)
    var pages = res.filter(obj => obj.type === 'dir')
                   .map(({ name, path, sha }) => ({ name, path, sha }))
    cb(null, pages)
  })
}

export function getAllPageContents (userId, fullName, cb) {
  var github = githubInterface(userId)
  var contents = github.getDirContents(fullName, 'pages')
  var pages = contents.filter(obj => obj.type === 'dir').map(obj => obj.name)
  async.map(pages, (page, cb) => {
    getPageContents(fullName, page, cb)
  }, cb)
}

export function getPageContents (userId, fullName, page, cb) {
  var github = githubInterface(userId)
  async.waterfall([
    function getPageDirContents (cb) {
      github.getDirContents(fullName, `pages/${page}`, cb)
    },
    function getPageDataJson (res, cb) {
      var contentJson = res.find(obj => obj.type === 'file' && obj.name === 'content.json')
      if (!contentJson) return cb('Missing content.json')
      github.getFileContents(fullName, `pages/${page}/${contentJson.name}`, (err, res) => {
        cb(err, { sha: contentJson.sha, content: res })
      })
    }
  ], (err, data) => {
    if (err) return cb(err)
    cb(null, {
      name: page,
      sha: data.sha,
      dateTime: new Date(),
      content: JSON.parse(data.content)
    })
  })
}

export function putFacts (userId, fullName, cb) {
  var github = githubInterface(userId)
  var project = Projects.findOne({ full_name: fullName })
  if (!project) return cb('Cannot find project')
  github.putFileContents(project.full_name, 'facts.json', {
    commitMsg: `Commit by ${Meteor.settings.appName}`,
    json: project.facts.content,
    sha: project.facts.sha
  }, cb)
}

export function putPageContent (userId, fullName, pageName, cb) {
  var github = githubInterface(userId)
  var project = Projects.findOne({ full_name: fullName })
  if (!project) return cb('Cannot find project')
  var page = Pages.findOne({ 'project._id': project._id, name: pageName })
  if (!page) return cb('Cannot find page')
  github.putFileContents(project.full_name, `pages/${pageName}/content.json`, {
    commitMsg: `Commit by ${Meteor.settings.appName}`,
    json: page.content,
    sha: page.lastCommit.content.sha
  }, cb)

}
