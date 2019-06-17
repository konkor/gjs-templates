const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gst = imports.gi.Gst;
const GstVideo = imports.gi.GstVideo;
const GstPbutils = imports.gi.GstPbutils;
const GdkX11 = imports.gi.GdkX11;
const Lang = imports.lang;

var CustomApplication = new Lang.Class ({
    Name: "CustomApplication",
    Extends: Gtk.Application,

    _init: function (args) {
        GLib.set_prgname ("custom-application");
        this.parent ({
            application_id: "org.konkor.template.application",
            flags: Gio.ApplicationFlags.HANDLES_OPEN
        });
        GLib.set_application_name ("Custom GTK Application");
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
        this.window.set_default_size (512, 320);
        this.hb = new Gtk.HeaderBar ();
        this.hb.set_show_close_button (true);
        this.hb.get_style_context ().add_class ("hb");
        this.window.set_titlebar (this.hb);
        this.video = new Gtk.EventBox ();
        this.window.add (this.video);

        this.video.connect ('realize', Lang.bind (this, (o)=>{
            this.handler = o.window.get_xid ();
            this.play ();
        }));

        Gst.init(null);
        GstPbutils.pb_utils_init ();
        //this.codec = new GstPbutils.CodecInstaller();
        this.playbin = Gst.ElementFactory.make("playbin", null);
        this.audiosink = Gst.ElementFactory.make("pulsesink", "audiosink");
        this.playbin.set_property("audio-sink", this.audiosink);

        //this.videoconv = Gst.ElementFactory.make("glcolorscale", "videoconv");
        this.videosink = Gst.ElementFactory.make("glimagesink", "videosink");

        /*this.bin = new Gst.Bin ({name:"videosink_bin"});
        this.bin.add (this.videoconv);
        this.bin.add (this.videosink);
        //this.bin.link (this.videoconv);
        //this.pad = this.videoconv.get_static_pad ("sink");
        this.gpad = new Gst.GhostPad ({"target":this.videoconv.get_static_pad ("sink")});
        print (this.pad);
        //this.gpad.target =this.pad;
        //this.gpad.set_target (this.pad.get_peer ());
        this.gpad.set_active (true);
        this.bin.add_pad (this.gpad);
        //this.pad = null;
        this.videoconv.link (this.videosink);
        */

        this.playbin.set_property("video-sink", this.videosink);

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
    },

    on_bus_message: function (msg) {
        if(GstVideo.is_video_overlay_prepare_window_handle_message (msg)) {
            var overlay = msg.src;
			if (!overlay) return false;
			overlay.set_window_handle (this.handler);
		} else if(GstPbutils.is_missing_plugin_message (msg)) {
		    print ("Missing codec:",GstPbutils.missing_plugin_message_get_installer_detail(msg));
		    print (GstPbutils.missing_plugin_message_get_description (msg));
            this.playbin.set_state(Gst.State.NULL);
            //this.codec.install_missing_codec(m);
		}
		return true;
    },

    play: function () {
        this.playbin.set_property ("uri", Gio.File.new_for_path ("/home/kapa/projects/gjs-templates/video-player/test.mp4").get_uri());
        this.playbin.set_state(Gst.State.READY);
        this.playbin.set_state(Gst.State.PLAYING);
    }
});

let app = new CustomApplication (ARGV);
app.run (ARGV);
