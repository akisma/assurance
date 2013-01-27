var assurance = require('../')
  , should    = require('should')
  , person    = require('./person')

function testNest() {
  var assure = assurance(person)

  assure.me('likes', function (hobby) {
    hobby.is('string')
  })

  assure.me('schedule', function () {
    assure.me('monday').is('array')

    assure.me('monday', function (activity) {
      activity.is('string')
    })

    assure.me('wednesday', function () {
      assure.me('start').is('string')
      assure.me('end').is('string')
    })
  })

  assure.end().should.have.length(0)
}

describe('Assurance', function () {
  it('should expose .single', function () {
    assurance.should.have.property('single')
  })

  describe('_constructor_', function () {
    it('should return an Assurance instance', function () {
      assurance(person).should.be.instanceOf(assurance.Assurance)
    })

    it('onlyFields should be optional', function () {
      should.not.exist(assurance(person).only)
    })

    it('alias should be optional', function () {
      should.not.exist(assurance(person).alias)
    })

    it('onlyFields can be a string', function () {
      var assure = assurance(person, 'age')

      assure.only.should.be.instanceOf(Array)
      should.deepEqual(assure.only, ['age'])
    })

    it('should be called as .(object, alias)', function () {
      var assure = assurance(person, { age: 'newAge' })

      should.not.exist(assure.only)
      should.deepEqual(assure.alias, { age: 'newAge' })
    })

    it('should throw if alias is not an object', function () {
      (function () {
        assurance(person, 'age', 123)
      }).should.throw('alias not an object')
    })
  })

  describe('#me', function () {
    it('should be an entry to validate fields', function () {
      var assure = assurance(person)

      assure.me('name').is('string')
      assure.me('age').isInt()
      assure.me('adult').is('boolean')

      assure.me('likes').is('array')

      assure.me('likes', function (value) {
        value.is('boolean')
      })

      assure.end().should.have.length(3)
    })

    it('should respect onlyFields', function () {
      var assure = assurance(person, ['age'])

      assure.me('name').is('number')
      assure.me('adult').is('string')
      assure.me('age').is('string')

      assure.end().should.have.length(1)
    })

    it('should be able to nest', testNest)
  })

  it('should be an entry to sanitize input', function () {
    var o = {
      integer: '123',
      string:  '   hello!    '
    }

    var assure = assurance(o)

    assure.me('integer').is('string').toInt().is('number')
    assure.me('string').is('string').trim().is('string')

    assure.end().should.have.length(0)

    o.integer.should.be.a('number')
    o.string.should.have.length(6)
  })
  
  describe('#end', function () {
    it('should return an array of Errors', function () {
      var assure = assurance(person)

      assure.me('age').is('string')
      assure.me('name').is('number')

      var errors = assure.end()

      errors.should.be.instanceOf(Array)

      for (var i = 0; i < errors.length; i++) {
        errors[i].should.be.instanceOf(Error)
        errors[i].should.be.instanceOf(assurance.errors.ValidationError)
      }
    })
  })

  describe('#custom', function () {
    it('should pass errors as the second argument', function (done) {
      assurance(person).me('age').custom(function (age, errors) {
        errors.should.equal(assurance.errors)
        done()
      })
    })

    it('should allow custom validators to be run', function () {
      var assure = assurance(person)

      assure.me('age').is('number').custom(function (age, errors) {
        if (age < 18) {
          return new errors.InvalidValue('only adults allowed')
        }
      }).is('string')

      var errors = assure.end()

      errors.should.have.length(1)
      errors[0].message.should.equal('only adults allowed')
    })
  })

  describe('#nest', function () {
    it('should nest validation', testNest)

    it('should nest in arrays', function () {
      var assure = assurance({
        bands: ['cranberries', 'the doors', 666]
      })

      assure.me('bands').nest(function (band) {
        band.is('string')
      })

      var errors = assure.end()

      errors.should.have.length(1)
      errors[0].type.should.equal('InvalidType')
      errors[0].param.should.equal('bands[2]')
    })

    it('should nest in complex ways', function () {
      var assure = assurance({
        i: {
          am: {
            sexy: true,
            cat:  true
          },
          and: {
            fluffy: false
          }
        }
      })

      assure.me('i', function () {
        assure.me('am', function () {
          assure.me('sexy').is('boolean')
          assure.me('cat').is('boolean')
        })

        assure.me('and', function () {
          assure.me('fluffy').is('boolean')
        })
      })

      assure.end().should.have.length(0)
    })
  })

  describe('#optional', function () {
    it('should bypass validations if field is missing', function () {
      var assure = assurance({
        null:      null,
        undefined: undefined,
        empty:     ''
      })

      assure.me('undefined').optional().is('string')
      assure.me('empty').optional().is('string')

      assure.end().should.have.length(0)

      assure.me('null').optional().is('string')

      assure.end().should.have.length(1)
    })
  })

  it('should respect alias', function () {
    var assure = assurance(person, { name: 'ALIAS' })

    assure.me('name').isInt()
    assure.end()[0].param.should.equal('ALIAS')
  })

  describe('.single', function () {
    it('should only validate a single field', function () {
      var assure = assurance.single(person, 'name').is('number')

      assure.end().should.have.length(1)
    })
  })

  describe('#default', function () {
    it('should set a value if the field is missing', function () {
      var o = {
        missing: undefined
      }

      var assure = assurance(o)

      assure.me('missing').default('exists')
      assure.hasErrors().should.be.false;
      (typeof o.missing).should.equal('string')
    })
  })  

  it('consists', function () {
    var o = {
      val: 'at_sign_@_not_allowed',
      other: 'abcjodsaogpowsnpoewanf'
    }

    assurance.single(o, 'val').consistsOf('abcdefghijklmnopqrstuvwxyz').end().should.have.length(1)
    assurance.single(o, 'other').consistsOf('abcdefghijklmnopqrstuvwxyz').end().should.have.length(0)
  })

  it('isPositive', function () {
    var o = {
      positive: 5,
      negative: -5,
      zero: 0,
      irrelevant: 'fagdsa'
    }

    assurance.single(o, 'positive').isPositive().end().should.have.length(0)
    assurance.single(o, 'negative').isPositive().end().should.have.length(1)
    assurance.single(o, 'zero').isPositive().end().should.have.length(0)
    assurance.single(o, 'zero').isPositive(false).end().should.have.length(1)
    assurance.single(o, 'irrelevant').isPositive().end().should.have.length(1)
  })

  it('gt', function () {
    var o = {
      fifty: 50,
      irrelevant: 'ffafa'
    }

    assurance.single(o, 'fifty').gt(40).end().should.have.length(0)
    assurance.single(o, 'fifty').gt(50).end().should.have.length(1)
    assurance.single(o, 'irrelevant').gt(50).end().should.have.length(1)
  })

  it('lt', function () {
    var o = {
      fifty: 50,
      irrelevant: 'ffafa'
    }

    assurance.single(o, 'fifty').lt(60).end().should.have.length(0)
    assurance.single(o, 'fifty').lt(50).end().should.have.length(1)
    assurance.single(o, 'irrelevant').lt(50).end().should.have.length(1)
  })

  it('max', function () {
    var o = { fifty: 50 }

    assurance.single(o, 'fifty').max(50).end().should.have.length(0)
    assurance.single(o, 'fifty').max(40).end().should.have.length(1)
    assurance.single(o, 'irrelevant').max(50).end().should.have.length(1)
  })

})