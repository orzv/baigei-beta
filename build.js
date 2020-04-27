#! /usr/bin/env node

'use strict'

var crypto = require('crypto')
var request = require('https').request
var qs = require('querystring')
var fs = require('fs')
var parseUrl = require('url').parse

var appid = process.env.client_id
var appkey = process.env.secret
var pid = process.env.pddpid

console.log('current enviroment: ', appid, pid)

// 发起拼多多API请求
function pdd(type, params, callback) {
	var args = Object.assign({
		type: type, timestamp: parseInt(Date.now() / 1000),
		client_id: appid
	}, params)
	var strtosign = appkey + Object.keys(args).sort().map(function (key) {
		return key + args[key]
	}).join('') + appkey
	args.sign = crypto.createHash('md5').update(strtosign).digest('hex').toUpperCase()

	request('https://gw-api.pinduoduo.com/api/router?' + qs.stringify(args)
		, {
			method: 'POST'
		}, function (res) {
			res.setEncoding('utf8')
			var result = ''
			res.on('data', function (s) {
				result += s
			}).on('end', function () {
				callback(result)
			})
		}).end('')
}

// 根据ID获取推广信息
// 目前等级不够没有权限，无法生成小程序二维码
function getInfosFromId(id, pid, callback) {
	var linkinfo = {}, pinfo = {}
	pdd('pdd.ddk.goods.promotion.url.generate', {
		p_id: pid, generate_schema_url: true,
		generate_short_url: true,
		generate_we_app: true,
		goods_id_list: '[' + id + ']',
		search_id: 'pdd.ddk.goods.recommend.get'
	}, function (json) {
		var data = JSON.parse(json)
		if (data.goods_promotion_url_generate_response.goods_promotion_url_list) {
			var info = data.goods_promotion_url_generate_response.goods_promotion_url_list[0]
			linkinfo = {
				title: info.we_app_info.title,
				link: info.mobile_short_url
			}
		}
		getBaseinfo()
	})

	function getBaseinfo() {
		pdd('pdd.ddk.goods.detail', {
			goods_id_list: '[' + id + ']',
			pid: pid,
			search_id: 'pdd.ddk.goods.recommend.get'
		}, function (json) {
			var data = JSON.parse(json)
			if (data.goods_detail_response.goods_details) {
				var info = data.goods_detail_response.goods_details[0]
				pinfo = {
					title: info.goods_name,
					pic: info.goods_image_url,
					price: info.min_group_price / 100,
					ticket: info.coupon_discount / 100
				}
			}
			callback(Object.assign({
				id: id
			}, linkinfo, pinfo))
		})
	}
}

// 生成data.json
function transformList(pid, callback) {
	var str = fs.readFileSync('./items.txt', {
		encoding: 'utf8'
	})

	// 缓存列表
	var cached = require('./data.json').list || []
	// 缓存ID列表
	var ids = cached.map(function (i) {
		return i.id
	})
	// 所有任务列表
	var arr = str.split(/\s+/).map(parseItemId)
	// 排重后的任务列表
	var tasks = arr.filter(function (i) {
		return !ids.includes(i)
	})
	console.log('任务数量：', tasks.length)
	each(arr, function (id, done) {
		getInfosFromId(id, pid, done)
	}, function (list) {
		// 新老列表和删除的任务
		var newlist = cached.concat(list.map(function (item) {
			item.link = item.link.match(/[a-z0-9]+$/i)[0]
			item.pic = item.pic
			item.desc = ''
			return item
		})).filter(function (i) {
			return arr.includes(i)
		})
		fs.writeFileSync('./data.json', JSON.stringify({
			list: list
		}))
		callback()
	})
}

// 转换商品ID
function parseItemId(str) {
	if (/^\d+$/.test(str)) return str
	var i = parseUrl(str)
	return qs.parse(i.query).goods_id
}

// 异步循环
function each(list, callback, done) {
	var results = new Array(list.length), count = 0
	list.forEach(function (item, index) {
		callback(item, function (i) {
			results[index] = i
			count++
			if (count == list.length) done(results)
		})
	})
}

transformList(pid, console.log)