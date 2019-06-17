//imports.gi.versions.ClutterGst = '2.0';

const Gtk = imports.gi.Gtk;
const Clutter = imports.gi.Clutter;
const GtkClutter = imports.gi.GtkClutter;
const ClutterGst = imports.gi.ClutterGst;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gst = imports.gi.Gst;
const GstVideo = imports.gi.GstVideo;
const GstPbutils = imports.gi.GstPbutils;
const GdkX11 = imports.gi.GdkX11;
const Lang = imports.lang;

var CG_VERSION = 3;
if (!ClutterGst.Content) CG_VERSION = 2;

let media = "";

var CustomApplication = new Lang.Class ({
    Name: "CustomApplication",
    Extends: Gtk.Application,

    _init: function (args) {
        GLib.set_prgname ("custom-application");
        this.parent ({
            flags: Gio.ApplicationFlags.HANDLES_OPEN
        });
        GLib.set_application_name ("Custom GTK Application");
        
        this.connect ('handle-local-options', this.on_local_options.bind (this));
    },

    on_local_options: function (app, options) {
        if (ARGV.length == 0) {
            print ("Usage: gjs vplayer.js media_file");
            this.quit ();
            return 1;
        } else if (!Gio.File.new_for_commandline_arg (ARGV[0]).query_exists (null)) {
            print ("NOT FOUND: " + Gio.File.new_for_commandline_arg (ARGV[0]).get_uri ());
            return 1;
        } else {
            media = Gio.File.new_for_commandline_arg (ARGV[0]).get_uri ();
        }

        print ("Media file: " + media);
        return -1;
    },

    vfunc_open: function(files) {
        this.parent();
        let s = "";
        files.forEach (f => {
            s = files.get.uri ();
        });
        if (s) {
            media = s;
            this.stop ();
            this.play ();
        }
    },

    vfunc_startup: function() {
        this.parent();
        Gdk.set_allowed_backends ("x11");
        this.handler = 0;
        this.window = new Gtk.Window ();
        this.window.set_icon_name ("org.konkor.custom");
        this.add_window (this.window);
        this.build ();
    },

    vfunc_activate: function() {
        this.window.show_all ();
        this.window.present ();
    },

    build: function() {
        GtkClutter.init(null);
        this.window.set_default_size (800, 520);
        this.hb = new Gtk.HeaderBar ();
        this.hb.set_show_close_button (true);
        this.hb.get_style_context ().add_class ("hb");
        this.window.set_titlebar (this.hb);
        this.video = new VideoWidget ();
        this.window.add (this.video);

        this.window.connect ('realize', Lang.bind (this, (o)=>{
            this.handler = o.window.get_xid ();
            //this.play ();
        }));

        Gst.init(null);
        ClutterGst.init(null);
        GstPbutils.pb_utils_init ();
        this.playbin = Gst.ElementFactory.make("playbin", null);
        this.audiosink = Gst.ElementFactory.make("pulsesink", "audiosink");
        this.playbin.set_property("audio-sink", this.audiosink);
        if (CG_VERSION < 3) {
          this.videosink = Gst.ElementFactory.make("cluttersink", "videosink");
          this.video.texture = new Clutter.Texture({"disable-slicing":true,"reactive":true});
          this.videosink.set_property("texture", this.video.texture);
          this.video.frame = new AspectFrame ();
          this.video.frame.add_child (this.video.texture);
        } else {
          this.videosink = new ClutterGst.VideoSink ();
          this.video.frame = new Clutter.Actor({
            "content": new ClutterGst.Aspectratio({"sink": this.videosink}),
            "name": "texture",
            "reactive": true
          });
        }
        this.video.add_texture ();

        this.playbin.set_property("video-sink", this.videosink);
        //print (this.videosink, this.video.texture);

        this.bus = this.playbin.get_bus();
        this.bus.add_signal_watch();
        this.bus.connect ("message", Lang.bind (this, (bus, msg) => {
            if (msg) this.on_bus_message (msg);
        }));
        this.window.connect ('destroy', Lang.bind (this, (o)=>{
            this.playbin.set_property ("uri", "");
            this.playbin.set_state(Gst.State.NULL);
        }));
        this.window.show_all ();
        this.play ();
        //this.window.fullscreen();

    },

    on_bus_message: function (msg) {
        if(GstVideo.is_video_overlay_prepare_window_handle_message (msg)) {
            var overlay = msg.src;
            if (!overlay) return false;
			overlay.set_window_handle (this.handler);
		} else if(GstPbutils.is_missing_plugin_message (msg)) {
		    print ("Missing codec:",GstPbutils.missing_plugin_message_get_installer_detail(msg));
		    print (GstPbutils.missing_plugin_message_get_description (m));
            this.playbin.set_state(Gst.State.NULL);
            //this.codec.install_missing_codec(m);
		} else if (msg.type == Gst.MessageType.STATE_CHANGED) {
            let [oldstate, newstate, pending] = msg.parse_state_changed ();
            //if (this.current_state == newstate) return true;
            //this.current_state = newstate;
            //this.emit ('state-changed', oldstate, newstate, pending);
        }
	    return true;
    },

    play: function () {
        this.playbin.set_property ("uri", media);
        this.playbin.set_state(Gst.State.READY);
        this.playbin.set_state(Gst.State.PLAYING);
        this.window.show_all ();
    },

    stop: function () {
        this.playbin.set_state (Gst.State.NULL);
    }
});

var VideoWidget = new Lang.Class ({
    Name: "VideoWidget",
    Extends: GtkClutter.Embed,

    _init: function () {
        this.parent ();
        this.build ();
    },

    build: function() {
        this.stage = this.get_stage ();
        this.stage.layout_manager = new Clutter.BinLayout({
          x_align: Clutter.BinAlignment.FILL,
          y_align: Clutter.BinAlignment.FILL,
        });
        this.stage.set_background_color (new Clutter.Color());
    },

    add_texture: function() {
        this.stage.add_child (this.frame);
    }
});

var AspectFrame = new Lang.Class ({
    Name: "AspectFrame",
    Extends: Clutter.Actor,

    _init: function () {
        this.parent ({name: "frame"});
        this.set_pivot_point ( 0.5, 0.5);
    },

    vfunc_allocate: function (box, flags) {
        this.parent (box, flags);
        let child = this.get_child_at_index (0);
        if (!child) return;
        var box_width = box.x2 - box.x1;
        var box_height = box.y2 - box.y1;
        let [,,width, height] = child.get_preferred_size ();
        if (width <= 0 || height <= 0) return;

        var aspect = box_width / box_height;
        var child_aspect = width / height;

        if (aspect < child_aspect) {
            width = box_width;
            height = box_width / child_aspect;
        } else {
            height = box_height;
            width = box_height * child_aspect;
        }
        let child_box = new Clutter.ActorBox({
            x1: (box_width - width) / 2,
            y1: (box_height - height) / 2,
            x2: (box_width - width) / 2 + width,
            y2: (box_height - height) / 2 + height
        });
        child.allocate (child_box, flags);
        child.queue_redraw ();
    },

    on_pick: function (color) {
        //print (actor);
        let child = this.get_child_at_index (0);
        if (!child) return;
        child.paint ();
    }
});

let app = new CustomApplication ({});
app.run (ARGV);
